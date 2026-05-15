'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Flag, PenLine, Trash2, Users, Wifi, WifiOff, X } from 'lucide-react'
import { useShirtChannel } from '@/lib/hooks/useShirtChannel'
import GhostBoxCanvas from '@/components/scribble/GhostBoxCanvas'
import DrawingCanvas, { type DrawingCanvasRef, type DrawingTool } from '@/components/scribble/DrawingCanvas'
import ScribbleToolbar from '@/components/scribble/ScribbleToolbar'
import { cn } from '@/lib/utils/cn'
import {
  clampScribbleBoxToCanvas,
  hasDrawableFabricJson,
  type ScribbleBox,
} from '@/lib/utils/scribbleContract'
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
  bodyStyle?:         string
  shirtColor?:        string
  headFrontUrl?:      string | null
  headBackUrl?:       string | null
  yearbookQuote?:     string | null
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
  bodyStyle = 'M1',
  shirtColor = '#F8F8F8',
  headFrontUrl,
  headBackUrl,
  yearbookQuote,
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
  const [plantedBox, setPlantedBox] = useState<ScribbleBox | null>(null)
  const [hasDrawing, setHasDrawing] = useState(false)
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

  const handlePlant = useCallback((box: ScribbleBox) => {
    const normalized = clampScribbleBoxToCanvas(box)
    setPlantedBox(normalized)
    setHasDrawing(false)
    setError(null)
    setMode('drawing')
    broadcastBoxPlanted(normalized.x, normalized.y, normalized.w, normalized.h)
  }, [broadcastBoxPlanted])

  const handleCancel = useCallback(() => {
    setMode('browse')
    setPlantedBox(null)
    setHasDrawing(false)
    broadcastBoxReleased()
  }, [broadcastBoxReleased])

  const handleLocalStroke = useCallback((fabricJson: object) => {
    setHasDrawing(hasDrawableFabricJson(fabricJson))
    broadcastStroke(fabricJson)
  }, [broadcastStroke])

  // ── Commit scribble ───────────────────────────────────────
  const handlePlace = useCallback(async () => {
    if (!plantedBox || !drawingRef.current) return
    setIsPlacing(true)
    setError(null)

    try {
      const svgContent = drawingRef.current.exportSvg()
      const canvasJson = drawingRef.current.exportJson()
      const normalizedBox = clampScribbleBoxToCanvas(plantedBox)

      if (drawingRef.current.isEmpty() || !hasDrawableFabricJson(canvasJson)) {
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
          x: normalizedBox.x,
          y: normalizedBox.y,
          w: normalizedBox.w,
          h: normalizedBox.h,
          canvas_svg:  svgContent,
          canvas_json: canvasJson,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        const messages: Record<string, string> = {
          COLLISION: 'Someone just placed a scribble there — try a different spot.',
          EMPTY_CANVAS: 'Canvas is empty — draw something first!',
          INVALID_BOX: 'That spot is no longer valid — choose another area.',
          INVALID_SVG: 'This drawing could not be saved safely — try clearing and drawing again.',
          FORBIDDEN: body.error ?? 'You cannot scribble on this shirt right now.',
          SAVE_FAILED: 'Failed to save scribble — please try again.',
        }
        setError(messages[String(body.code)] ?? body.error ?? 'Something went wrong')
        setIsPlacing(false)
        return
      }

      broadcastBoxReleased()
      // Notify all viewers the texture changed
      broadcastTextureUpdated(panel)
      setMode('browse')
      setPlantedBox(null)
      setHasDrawing(false)
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
  const panelOccupancy: Record<Panel, number> = {
    front:   Number(shirt.front_occupancy ?? 0),
    back:    Number(shirt.back_occupancy ?? 0),
    sleeves: Number(shirt.sleeves_occupancy ?? 0),
  }
  const panelTitle: Record<Panel, string> = {
    front:   'Front shirt',
    back:    'Back shirt',
    sleeves: 'Sleeve canvas',
  }
  const panelNote: Record<Panel, string> = {
    front:   'For names, tiny sketches, and face-first memories.',
    back:    'Best for longer notes and bigger farewell drawings.',
    sleeves: 'Small marks, initials, icons, and inside jokes.',
  }
  const headUrl = panel === 'back' ? (headBackUrl ?? headFrontUrl) : headFrontUrl
  const darkShirt = /^#(?:[0-3][0-9a-f]|4[0-9a-f])/i.test(shirtColor)
  const shoulderScale = bodyStyle.startsWith('M') ? 1 : 0.94

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f8f5ee] shadow-[0_24px_70px_rgba(45,35,22,0.08)]">
        <div className="flex flex-col gap-3 border-b border-black/10 bg-white/55 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-ink-900">{panelTitle[panel]}</h2>
              <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                {Math.round(panelOccupancy[panel])}% filled
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{panelNote[panel]}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
              {isConnected ? <Wifi size={13} className="text-green-500" /> : <WifiOff size={13} className="text-gray-400" />}
              {viewerCount > 0 ? `${viewerCount} live` : 'solo'}
            </span>
            {ghostBoxes.size > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                <Users size={13} />
                {ghostBoxes.size} writing
              </span>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-5">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[610px] overflow-hidden rounded-[26px] border border-black/10 bg-[#ece5d9]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.85),rgba(255,255,255,0)_30%),linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0))]" />

            <div
              className="absolute left-1/2 top-[3%] z-10 rounded-full border-4 border-[#f8f5ee] bg-[#dfe3ec] shadow-sm"
              style={{
                width: '18%',
                aspectRatio: '1 / 1',
                transform: 'translateX(-50%)',
                backgroundImage: headUrl ? `url("${headUrl}")` : undefined,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                opacity: panel === 'back' ? 0.72 : 1,
              }}
            />

            <div
              className="absolute left-1/2 top-[18%] rounded-[999px] border border-black/5"
              style={{
                width: `${86 * shoulderScale}%`,
                height: '13%',
                transform: 'translateX(-50%)',
                background: shirtColor,
                boxShadow: 'inset 0 -18px 30px rgba(0,0,0,0.05)',
              }}
            />
            <div
              className="absolute left-[5%] top-[24%] rounded-[999px] border border-black/5"
              style={{
                width: `${22 * shoulderScale}%`,
                height: '11%',
                background: shirtColor,
                transform: 'rotate(-8deg)',
              }}
            />
            <div
              className="absolute right-[5%] top-[24%] rounded-[999px] border border-black/5"
              style={{
                width: `${22 * shoulderScale}%`,
                height: '11%',
                background: shirtColor,
                transform: 'rotate(8deg)',
              }}
            />

            <div
              className={cn(
                'absolute left-[20%] top-[24%] z-20 h-[72%] w-[60%] overflow-hidden border bg-white',
                darkShirt ? 'border-white/25' : 'border-black/10'
              )}
              style={{
                borderRadius: '18px 18px 54px 54px',
                background: shirtColor,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24), inset 0 -26px 44px rgba(0,0,0,0.06)',
              }}
            >
              <div className={cn('absolute left-1/2 top-0 z-30 h-[13%] w-[32%] -translate-x-1/2 rounded-b-full border-x border-b', darkShirt ? 'border-white/25 bg-black/15' : 'border-black/10 bg-white/45')} />
              <div className="absolute inset-0 z-10">
                {mode === 'browse' && (
                  <>
                    {displayedScribbles.length === 0 && (
                      <div className={cn('absolute inset-4 flex items-center justify-center rounded-2xl border border-dashed text-center', darkShirt ? 'border-white/20 text-white/55' : 'border-black/15 text-black/40')}>
                        <p className="max-w-[180px] text-xs font-medium">
                          Empty space. Claim a spot and make this shirt feel lived in.
                        </p>
                      </div>
                    )}

                    {displayedScribbles.filter(s => s.canvas_svg).map(s => (
                      <div
                        key={s.id}
                        aria-hidden
                        className="absolute bg-contain bg-center bg-no-repeat"
                        style={{
                          left:   `${(s.x / SHIRT_W) * 100}%`,
                          top:    `${(s.y / SHIRT_H) * 100}%`,
                          width:  `${(s.w / SHIRT_W) * 100}%`,
                          height: `${(s.h / SHIRT_H) * 100}%`,
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.canvas_svg!)}")`,
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                    {ghostBoxes.size > 0 && (
                      <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${SHIRT_W} ${SHIRT_H}`}>
                        {[...ghostBoxes.values()].filter(g => g.panel === panel).map(g => (
                          <g key={g.userId}>
                            <rect
                              x={g.x} y={g.y} width={g.w} height={g.h}
                              fill={g.isPlanted ? 'rgba(80,80,200,0.12)' : 'rgba(150,150,255,0.09)'}
                              stroke={g.isPlanted ? 'rgba(80,80,200,0.72)' : 'rgba(150,150,255,0.55)'}
                              strokeWidth="2"
                              strokeDasharray={g.isPlanted ? undefined : '5 5'}
                            />
                            <text x={g.x + 6} y={g.y + 16} fontSize="11" fill="rgba(50,50,150,0.95)" fontWeight="700">
                              {g.displayName}
                            </text>
                          </g>
                        ))}
                      </svg>
                    )}

                    {displayedScribbles.length > 0 && (isOwner || canScribble) && (
                      <>
                        {displayedScribbles.map(s => {
                          const isHovered = hoveredId === s.id
                          const isReported = reportedIds.has(s.id)

                          return (
                            <button
                              key={s.id}
                              type="button"
                              aria-label={isOwner ? 'Remove scribble' : 'Report scribble'}
                              className={cn(
                                'absolute rounded-sm border transition',
                                isHovered ? 'border-black/25 bg-black/5' : 'border-transparent bg-transparent'
                              )}
                              style={{
                                left:   `${(s.x / SHIRT_W) * 100}%`,
                                top:    `${(s.y / SHIRT_H) * 100}%`,
                                width:  `${(s.w / SHIRT_W) * 100}%`,
                                height: `${(s.h / SHIRT_H) * 100}%`,
                              }}
                              onPointerEnter={() => setHoveredId(s.id)}
                              onPointerLeave={() => setHoveredId(null)}
                              onClick={() => {
                                if (isOwner) handleRemoveScribble(s.id)
                                else handleReportScribble(s.id)
                              }}
                            >
                              <span className={cn(
                                'absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition',
                                isOwner ? 'bg-red-600' : isReported ? 'bg-green-600' : 'bg-amber-500',
                                isHovered ? 'opacity-100' : 'opacity-75'
                              )}>
                                {isOwner ? <Trash2 size={13} /> : isReported ? <Check size={13} /> : <Flag size={13} />}
                              </span>
                            </button>
                          )
                        })}
                      </>
                    )}
                  </>
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
                  <div className="relative h-full w-full">
                    {existingScribbles.filter(s => s.canvas_svg).map(s => (
                      <div
                        key={s.id}
                        aria-hidden
                        className="absolute bg-contain bg-center bg-no-repeat"
                        style={{
                          left:   `${(s.x / SHIRT_W) * 100}%`,
                          top:    `${(s.y / SHIRT_H) * 100}%`,
                          width:  `${(s.w / SHIRT_W) * 100}%`,
                          height: `${(s.h / SHIRT_H) * 100}%`,
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.canvas_svg!)}")`,
                          pointerEvents: 'none',
                        }}
                      />
                    ))}
                    <div
                      className="absolute overflow-hidden rounded-md border-2 border-ink-900 bg-white/5 shadow-lg animate-box-plant"
                      style={{
                        left:   `${(plantedBox.x / SHIRT_W) * 100}%`,
                        top:    `${(plantedBox.y / SHIRT_H) * 100}%`,
                        width:  `${(plantedBox.w / SHIRT_W) * 100}%`,
                        height: `${(plantedBox.h / SHIRT_H) * 100}%`,
                      }}
                    >
                      <DrawingCanvas
                        key={`${shirt.id}-${panel}-${plantedBox.x}-${plantedBox.y}-${plantedBox.w}-${plantedBox.h}`}
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
                        onStroke={handleLocalStroke}
                        onRemoteStroke={handleStrokeHandlerRequest}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {yearbookQuote && (
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-black/10 bg-white/72 px-3 py-2 text-center text-xs italic text-gray-600 backdrop-blur">
                &ldquo;{yearbookQuote}&rdquo;
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/10 bg-white/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-h-[20px] text-sm">
            {error && <p className="text-red-600">{error}</p>}
            {removeError && <p className="text-red-600">{removeError}</p>}
            {!error && !removeError && mode === 'browse' && (
              <p className="text-xs text-gray-500">
                {isOwner
                  ? 'Tap a saved scribble to remove it from your shirt.'
                  : canScribble
                    ? `Choose a spot, draw, then save it to ${ownerName}'s shirt.`
                    : `${ownerName}'s shirt is view-only for your account right now.`}
              </p>
            )}
          </div>

          {mode === 'browse' && !isOwner && canScribble && (
            <button
              onClick={enterPlacementMode}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              <PenLine size={16} />
              Scribble on this shirt
            </button>
          )}

          {mode === 'placement' && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-gray-50"
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </section>

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
          canPlace={hasDrawing}
        />
      )}
    </div>
  )
}
