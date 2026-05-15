'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useShirtChannel } from '@/lib/hooks/useShirtChannel'
import GhostBoxCanvas from '@/components/scribble/GhostBoxCanvas'
import DrawingCanvas, { type DrawingCanvasRef, type DrawingTool } from '@/components/scribble/DrawingCanvas'
import ScribbleToolbar from '@/components/scribble/ScribbleToolbar'
import { cn } from '@/lib/utils/cn'
import {
  SHIRT_W, SHIRT_H, TOOL_PEN, CANVAS_COLORS,
} from '@/lib/constants'
import type { Panel } from '@/lib/supabase/types'
import type { ScribbleRow, ShirtRow } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────

type ScribbleMode = 'browse' | 'placement' | 'drawing'

interface ShirtViewProps {
  shirt:             ShirtRow
  ownerId:           string
  ownerName:         string
  panel:             Panel
  existingScribbles: Pick<ScribbleRow, 'id' | 'x' | 'y' | 'w' | 'h' | 'canvas_svg'>[]
  currentUserId:     string | null
  currentUserName:   string | null
  canScribble:       boolean
  isOwner:           boolean
  textureUrl?:       string
  onScribblePlaced?: () => void
}

// ── Component ─────────────────────────────────────────────────

export default function ShirtView({
  shirt,
  ownerId,
  ownerName,
  panel,
  existingScribbles,
  currentUserId,
  currentUserName,
  canScribble,
  isOwner,
  textureUrl,
  onScribblePlaced,
}: ShirtViewProps) {
  const router = useRouter()

  const [mode,       setMode]       = useState<ScribbleMode>('browse')
  const [tool,       setTool]       = useState<DrawingTool>(TOOL_PEN)
  const [color,      setColor]      = useState<string>(CANVAS_COLORS[0])
  const [brushSize,  setBrushSize]  = useState(4)
  const [opacity,    setOpacity]    = useState(1)
  const [fillShapes, setFillShapes] = useState(false)
  const [fontSize,   setFontSize]   = useState<'sm' | 'md' | 'lg'>('md')
  const [fontStyle,  setFontStyle]  = useState<'normal' | 'bold' | 'italic'>('normal')
  const [isPlacing,  setIsPlacing]  = useState(false)
  const [plantedBox, setPlantedBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  // Local removed/reported scribble IDs for optimistic UI
  const [removedIds,  setRemovedIds]  = useState<Set<string>>(new Set())
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [hoveredId,   setHoveredId]   = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const drawingRef = useRef<DrawingCanvasRef>(null)

  // Ctrl+Z / Cmd+Z shortcut while in drawing mode
  useEffect(() => {
    if (mode !== 'drawing') return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        drawingRef.current?.undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode])

  // ── Realtime channel ──────────────────────────────────────
  const {
    ghostBoxes,
    viewerCount,
    textureVersion,
    isConnected,
    broadcastBoxMoved,
    broadcastBoxPlanted,
    broadcastBoxReleased,
    broadcastStroke,
    broadcastTextureUpdated,
    setStrokeHandler,
  } = useShirtChannel({
    ownerId,
    shirtNumber:     shirt.shirt_number,
    currentPanel:    panel,
    currentUserId,
    currentUserName,
  })

  // Wire stroke handler to DrawingCanvas
  const handleStrokeHandlerRequest = useCallback((handler: Parameters<typeof setStrokeHandler>[0]) => {
    setStrokeHandler(handler)
  }, [setStrokeHandler])

  // ── Placement ─────────────────────────────────────────────
  const enterPlacementMode = () => setMode('placement')

  const handlePlant = useCallback((box: { x: number; y: number; w: number; h: number }) => {
    setPlantedBox(box)
    setMode('drawing')
    broadcastBoxPlanted(box.x, box.y, box.w, box.h)
  }, [broadcastBoxPlanted])

  const handleCancel = useCallback(() => {
    setMode('browse')
    setPlantedBox(null)
    broadcastBoxReleased()
  }, [broadcastBoxReleased])

  // ── Commit scribble ───────────────────────────────────────
  const handlePlace = useCallback(async () => {
    if (!plantedBox || !drawingRef.current) return
    setIsPlacing(true)
    setError(null)

    try {
      const svgContent = drawingRef.current.exportSvg()
      const canvasJson = drawingRef.current.exportJson()

      if (!svgContent || svgContent.trim() === '') {
        setError('Canvas is empty — draw something first!')
        setIsPlacing(false)
        return
      }

      const res = await fetch('/api/scribble/place', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          owner_id:     ownerId,
          shirt_number: shirt.shirt_number,
          panel,
          x: plantedBox.x,
          y: plantedBox.y,
          w: plantedBox.w,
          h: plantedBox.h,
          canvas_svg:  svgContent,
          canvas_json: canvasJson,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        if (body.code === 'COLLISION') {
          setError('Someone just placed a scribble there — try a different spot.')
        } else {
          setError(body.error ?? 'Something went wrong')
        }
        setIsPlacing(false)
        return
      }

      broadcastBoxReleased()
      // Notify all viewers the texture changed
      broadcastTextureUpdated(panel)
      setMode('browse')
      setPlantedBox(null)
      onScribblePlaced?.()
      // Refresh server data (new scribble bounding box appears, texture URL updates)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsPlacing(false)
    }
  }, [plantedBox, ownerId, shirt.shirt_number, panel, broadcastBoxReleased, broadcastTextureUpdated, onScribblePlaced, router])

  // ── Remove scribble (owner action) ───────────────────────
  const handleRemoveScribble = useCallback(async (scribbleId: string) => {
    // Optimistic — hide immediately
    setRemovedIds(prev => new Set([...prev, scribbleId]))
    setRemoveError(null)

    const res = await fetch('/api/scribble/remove', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ scribble_id: scribbleId }),
    })

    if (res.ok) {
      broadcastTextureUpdated(panel)
      router.refresh()
    } else {
      // Rollback on failure
      setRemovedIds(prev => { const next = new Set(prev); next.delete(scribbleId); return next })
      setRemoveError('Could not remove scribble — try again.')
    }
  }, [panel, broadcastTextureUpdated, router])

  // ── Report scribble ───────────────────────────────────────
  const handleReportScribble = useCallback(async (scribbleId: string) => {
    if (reportedIds.has(scribbleId)) return
    setReportedIds(prev => new Set([...prev, scribbleId]))
    await fetch('/api/scribble/report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ scribble_id: scribbleId }),
    })
  }, [reportedIds])

  // Filter out optimistically-removed scribbles
  const displayedScribbles = existingScribbles.filter(s => !removedIds.has(s.id))

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      {/* Shirt canvas area */}
      <div className="flex-1 relative">
        {/* Live presence indicator */}
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <span className={cn(
            'inline-block w-2 h-2 rounded-full',
            isConnected ? 'bg-green-400' : 'bg-gray-300'
          )} />
          {viewerCount > 0 ? `${viewerCount} people viewing this shirt` : 'Just you here'}
          {ghostBoxes.size > 0 && (
            <span className="text-scribble-purple font-medium">
              · {ghostBoxes.size} scribbling now
            </span>
          )}
        </div>

        {mode === 'browse' && (
          <div className="relative w-full" style={{ aspectRatio: `${SHIRT_W}/${SHIRT_H}` }}>
            {/* Base shirt area */}
            {displayedScribbles.length === 0 && (
              <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-sm text-gray-400">No scribbles yet — be the first!</p>
              </div>
            )}

            {/* SVG scribble overlays — each scribble rendered at its bounding box */}
            {displayedScribbles.filter(s => s.canvas_svg).map(s => (
              <img
                key={s.id}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.canvas_svg!)}`}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left:   `${(s.x / SHIRT_W) * 100}%`,
                  top:    `${(s.y / SHIRT_H) * 100}%`,
                  width:  `${(s.w / SHIRT_W) * 100}%`,
                  height: `${(s.h / SHIRT_H) * 100}%`,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            ))}

            {/* Other users' ghost boxes */}
            {ghostBoxes.size > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${SHIRT_W} ${SHIRT_H}`}>
                {[...ghostBoxes.values()].filter(g => g.panel === panel).map(g => (
                  <g key={g.userId}>
                    <rect
                      x={g.x} y={g.y} width={g.w} height={g.h}
                      fill={g.isPlanted ? 'rgba(80,80,200,0.1)' : 'rgba(150,150,255,0.08)'}
                      stroke={g.isPlanted ? 'rgba(80,80,200,0.7)' : 'rgba(150,150,255,0.5)'}
                      strokeWidth="1.5"
                      strokeDasharray={g.isPlanted ? undefined : '4 4'}
                      className="transition-all duration-75"
                      style={{ transform: 'translateZ(0)' }}
                    />
                    <text x={g.x + 4} y={g.y + 14} fontSize="10" fill="rgba(60,60,180,0.9)" fontWeight="bold">
                      {g.displayName}
                    </text>
                  </g>
                ))}
              </svg>
            )}

            {/* ── Scribble interaction overlays ── */}
            {/* Owner: remove button; Others: report button */}
            {displayedScribbles.length > 0 && (isOwner || canScribble) && (
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${SHIRT_W} ${SHIRT_H}`}
                style={{ pointerEvents: 'auto' }}
              >
                {displayedScribbles.map(s => {
                  const isHovered   = hoveredId === s.id
                  const isReported  = reportedIds.has(s.id)
                  const btnColor    = isOwner ? 'rgba(220,38,38,0.88)' : 'rgba(245,158,11,0.88)'
                  const btnLabel    = isOwner ? '×' : (isReported ? '✓' : '🚩')

                  return (
                    <g
                      key={s.id}
                      onMouseEnter={() => setHoveredId(s.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ cursor: isHovered ? 'pointer' : 'default' }}
                    >
                      {/* Hit area + hover highlight */}
                      <rect
                        x={s.x} y={s.y} width={s.w} height={s.h}
                        fill={isHovered ? 'rgba(0,0,0,0.06)' : 'transparent'}
                        stroke={isHovered ? 'rgba(0,0,0,0.18)' : 'transparent'}
                        strokeWidth="1"
                        rx="2"
                        style={{ pointerEvents: 'all' }}
                      />
                      {/* Action button — visible on hover */}
                      {isHovered && (
                        <g
                          onClick={() => {
                            if (isOwner) handleRemoveScribble(s.id)
                            else         handleReportScribble(s.id)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            x={s.x + s.w - 18} y={s.y + 2}
                            width={16} height={16}
                            rx={3}
                            fill={isReported && !isOwner ? 'rgba(34,197,94,0.88)' : btnColor}
                          />
                          <text
                            x={s.x + s.w - 10} y={s.y + 13}
                            fontSize={isOwner ? 14 : 10}
                            textAnchor="middle"
                            fill="white"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {btnLabel}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            )}
          </div>
        )}

        {mode === 'placement' && (
          <GhostBoxCanvas
            panel={panel}
            existingScribbles={existingScribbles}
            liveGhostBoxes={ghostBoxes}
            textureUrl={textureUrl}
            textureVersion={textureVersion}
            onPlant={handlePlant}
            onCancel={handleCancel}
            onBoxMoved={broadcastBoxMoved}
          />
        )}

        {mode === 'drawing' && plantedBox && (
          <div className="relative w-full" style={{ aspectRatio: `${SHIRT_W}/${SHIRT_H}` }}>
            {/* Background: existing scribbles as SVG overlays (context for the drafter) */}
            {existingScribbles.filter(s => s.canvas_svg).map(s => (
              <img
                key={s.id}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.canvas_svg!)}`}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left:   `${(s.x / SHIRT_W) * 100}%`,
                  top:    `${(s.y / SHIRT_H) * 100}%`,
                  width:  `${(s.w / SHIRT_W) * 100}%`,
                  height: `${(s.h / SHIRT_H) * 100}%`,
                  pointerEvents: 'none',
                }}
              />
            ))}
            {/* Drawing canvas positioned over planted box */}
            <div
              className="absolute border-2 border-ink-900 rounded shadow-lg bg-white/5 animate-box-plant"
              style={{
                left:   `${(plantedBox.x / SHIRT_W) * 100}%`,
                top:    `${(plantedBox.y / SHIRT_H) * 100}%`,
                width:  `${(plantedBox.w / SHIRT_W) * 100}%`,
                height: `${(plantedBox.h / SHIRT_H) * 100}%`,
              }}
            >
              <DrawingCanvas
                ref={drawingRef}
                w={plantedBox.w}
                h={plantedBox.h}
                tool={tool}
                color={color}
                brushSize={brushSize}
                opacity={opacity}
                fillShapes={fillShapes}
                fontSize={fontSize}
                fontStyle={fontStyle}
                onStroke={broadcastStroke}
                onRemoteStroke={handleStrokeHandlerRequest}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        {removeError && (
          <p className="mt-2 text-sm text-red-500">{removeError}</p>
        )}

        {/* Owner hint when scribbles are present */}
        {mode === 'browse' && isOwner && displayedScribbles.length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400 text-center">
            Hover over a scribble and click <strong>×</strong> to remove it
          </p>
        )}
        {mode === 'browse' && !isOwner && canScribble && displayedScribbles.length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400 text-center">
            Hover over a scribble and click <strong>🚩</strong> to report it
          </p>
        )}
      </div>

      {/* Toolbar (only in drawing mode) */}
      {mode === 'drawing' && (
        <ScribbleToolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          opacity={opacity}
          fillShapes={fillShapes}
          fontSize={fontSize}
          fontStyle={fontStyle}
          onTool={setTool}
          onColor={setColor}
          onBrushSize={setBrushSize}
          onOpacity={setOpacity}
          onFill={setFillShapes}
          onFontSize={setFontSize}
          onFontStyle={setFontStyle}
          onUndo={() => drawingRef.current?.undo()}
          onClear={() => drawingRef.current?.clear()}
          onPlace={handlePlace}
          isPlacing={isPlacing}
        />
      )}

      {/* Scribble CTA (browse mode only, not owner) */}
      {mode === 'browse' && !isOwner && canScribble && (
        <div className="flex flex-col items-start gap-2 pt-8">
          <button
            onClick={enterPlacementMode}
            className="px-4 py-2 bg-ink-900 hover:bg-ink-700 text-white rounded-xl font-medium text-sm transition shadow-sm"
          >
            ✏️ Scribble on this shirt
          </button>
        </div>
      )}
    </div>
  )
}
