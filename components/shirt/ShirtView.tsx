'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Flag, Minus, PenLine, Plus, RotateCcw, Save, Trash2, Users, Wifi, WifiOff, X } from 'lucide-react'
import DrawingCanvas, { type DrawingCanvasRef, type DrawingTool } from '@/components/scribble/DrawingCanvas'
import ScribbleToolbar from '@/components/scribble/ScribbleToolbar'
import ShirtShell from '@/components/shirt/ShirtShell'
import { useShirtChannel } from '@/lib/hooks/useShirtChannel'
import { hasDrawableFabricJson } from '@/lib/utils/scribbleContract'
import { CANVAS_COLORS, SHIRT_H, SHIRT_W, TOOL_PEN, TOOL_TEXT } from '@/lib/constants'
import { cn } from '@/lib/utils/cn'
import type { Panel, ScribbleRow, ShirtRow } from '@/lib/supabase/types'

type ScribbleMode = 'browse' | 'drawing'

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
  textureUrl?:        string
  onScribblePlaced?:  () => void
}

const ZOOM_LEVELS = [1, 1.35, 1.75, 2.25, 3]
const QUICK_EMOJI = '🫶'

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
  onScribblePlaced,
}: ShirtViewProps) {
  const router = useRouter()
  const drawingRef = useRef<DrawingCanvasRef>(null)

  const [mode, setMode] = useState<ScribbleMode>('browse')
  const [tool, setTool] = useState<DrawingTool>(TOOL_PEN)
  const [color, setColor] = useState<string>(CANVAS_COLORS[0])
  const [brushSize, setBrushSize] = useState(4)
  const [opacity, setOpacity] = useState(1)
  const [fillShapes, setFillShapes] = useState(false)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic'>('normal')
  const [zoomIndex, setZoomIndex] = useState(0)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const {
    viewerCount,
    isConnected,
    broadcastTextureUpdated,
  } = useShirtChannel({
    ownerId,
    shirtNumber: shirt.shirt_number,
    currentPanel: panel,
    currentUserId,
    currentUserName,
  })

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

  const displayedScribbles = existingScribbles.filter(s => !removedIds.has(s.id))
  const headUrl = panel === 'back' ? (headBackUrl ?? headFrontUrl) : headFrontUrl
  const zoom = ZOOM_LEVELS[zoomIndex]

  const panelOccupancy: Record<Panel, number> = {
    front: Number(shirt.front_occupancy ?? 0),
    back: Number(shirt.back_occupancy ?? 0),
    sleeves: Number(shirt.sleeves_occupancy ?? 0),
  }

  const panelTitle: Record<Panel, string> = {
    front: 'Front shirt',
    back: 'Back shirt',
    sleeves: 'Sleeve canvas',
  }

  const panelNote: Record<Panel, string> = {
    front: 'Sign where the shirt would actually be signed.',
    back: 'Best for bigger farewell notes and inside jokes.',
    sleeves: 'Small marks, initials, icons, and quick emojis.',
  }

  const enterStudio = useCallback(() => {
    setMode('drawing')
    setZoomIndex(1)
    setTool(TOOL_PEN)
    setHasDrawing(false)
    setError(null)
  }, [])

  const cancelStudio = useCallback(() => {
    setMode('browse')
    setZoomIndex(0)
    setHasDrawing(false)
    setError(null)
  }, [])

  const handleLocalStroke = useCallback((fabricJson: object) => {
    setHasDrawing(hasDrawableFabricJson(fabricJson))
  }, [])

  const handleSaveDirect = useCallback(async () => {
    if (!drawingRef.current) return
    setIsSaving(true)
    setError(null)

    try {
      const layer = await drawingRef.current.exportLayer()
      if (!layer || drawingRef.current.isEmpty()) {
        setError('Draw or add something before saving.')
        setIsSaving(false)
        return
      }

      const res = await fetch('/api/scribble/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placement_mode: 'direct',
          owner_id: ownerId,
          shirt_number: shirt.shirt_number,
          panel,
          x: layer.box.x,
          y: layer.box.y,
          w: layer.box.w,
          h: layer.box.h,
          canvas_svg: layer.canvasSvg,
          canvas_json: layer.canvasJson,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const messages: Record<string, string> = {
          EMPTY_CANVAS: 'Draw or add something before saving.',
          INVALID_BOX: 'That mark could not be placed on the shirt. Try a smaller area.',
          INVALID_SVG: 'This drawing could not be saved safely. Try clearing and drawing again.',
          FORBIDDEN: body.error ?? 'You cannot scribble on this shirt right now.',
          SAVE_FAILED: 'Failed to save scribble. Please try again.',
        }
        setError(messages[String(body.code)] ?? body.error ?? 'Something went wrong')
        setIsSaving(false)
        return
      }

      broadcastTextureUpdated(panel)
      setMode('browse')
      setZoomIndex(0)
      setHasDrawing(false)
      onScribblePlaced?.()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [broadcastTextureUpdated, onScribblePlaced, ownerId, panel, router, shirt.shirt_number])

  const handleRemoveScribble = useCallback(async (scribbleId: string) => {
    setRemovedIds(prev => new Set([...prev, scribbleId]))
    setRemoveError(null)

    const res = await fetch('/api/scribble/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scribble_id: scribbleId }),
    })

    if (res.ok) {
      broadcastTextureUpdated(panel)
      router.refresh()
    } else {
      setRemovedIds(prev => { const next = new Set(prev); next.delete(scribbleId); return next })
      setRemoveError('Could not remove scribble. Try again.')
    }
  }, [broadcastTextureUpdated, panel, router])

  const handleReportScribble = useCallback(async (scribbleId: string) => {
    if (reportedIds.has(scribbleId)) return
    setReportedIds(prev => new Set([...prev, scribbleId]))
    await fetch('/api/scribble/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scribble_id: scribbleId }),
    })
  }, [reportedIds])

  const renderSavedScribbles = (interactive: boolean) => (
    <>
      {displayedScribbles.filter(s => s.canvas_svg).map(s => (
        <div
          key={s.id}
          aria-hidden
          className="absolute bg-contain bg-center bg-no-repeat"
          style={{
            left: `${(s.x / SHIRT_W) * 100}%`,
            top: `${(s.y / SHIRT_H) * 100}%`,
            width: `${(s.w / SHIRT_W) * 100}%`,
            height: `${(s.h / SHIRT_H) * 100}%`,
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.canvas_svg!)}")`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {interactive && displayedScribbles.map(s => {
        const isHovered = hoveredId === s.id
        const isReported = reportedIds.has(s.id)

        return (
          <button
            key={s.id}
            type="button"
            aria-label={isOwner ? 'Remove scribble' : 'Report scribble'}
            className={cn('absolute rounded-sm border transition', isHovered ? 'border-black/25 bg-black/5' : 'border-transparent bg-transparent')}
            style={{
              left: `${(s.x / SHIRT_W) * 100}%`,
              top: `${(s.y / SHIRT_H) * 100}%`,
              width: `${(s.w / SHIRT_W) * 100}%`,
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
  )

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
            {mode === 'browse' && !isOwner && canScribble && (
              <button
                onClick={enterStudio}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-700"
              >
                <PenLine size={13} />
                Sign now
              </button>
            )}
            {mode === 'drawing' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                <Users size={13} />
                Studio open
              </span>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-5">
          <ShirtShell
            shirtColor={shirtColor}
            headUrl={headUrl}
            panel={panel}
            className="max-w-[640px]"
          >
            {mode === 'browse' && (
              <div className="absolute inset-0">
                {displayedScribbles.length === 0 && (
                  <div className="absolute inset-4 flex items-center justify-center rounded-2xl border border-dashed border-black/15 text-center text-black/40">
                    <p className="max-w-[190px] text-xs font-medium">
                      Nobody has signed this surface yet. Be the first mark on the fabric.
                    </p>
                  </div>
                )}
                {renderSavedScribbles(isOwner || canScribble)}
              </div>
            )}

            {mode === 'drawing' && (
              <div className="absolute inset-0 overflow-auto bg-white/0" style={{ touchAction: 'pan-x pan-y' }}>
                <div
                  className="relative min-h-full min-w-full"
                  style={{
                    width: `${zoom * 100}%`,
                    height: `${zoom * 100}%`,
                  }}
                >
                  {renderSavedScribbles(false)}
                  <DrawingCanvas
                    ref={drawingRef}
                    w={SHIRT_W}
                    h={SHIRT_H}
                    tool={tool}
                    color={color}
                    brushSize={brushSize}
                    opacity={opacity}
                    fillShapes={fillShapes}
                    fontSize={fontSize}
                    fontStyle={fontStyle}
                    onStroke={handleLocalStroke}
                  />
                </div>
              </div>
            )}
          </ShirtShell>
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
                    ? `Open the studio and sign directly on ${ownerName}'s shirt.`
                    : `${ownerName}'s shirt is view-only for your account right now.`}
              </p>
            )}
            {!error && mode === 'drawing' && (
              <p className="text-xs text-gray-500">
                Zoom into the shirt, add your mark, then save it as one lightweight layer.
              </p>
            )}
          </div>

          {mode === 'browse' && !isOwner && canScribble && (
            <button
              onClick={enterStudio}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-ink-700"
            >
              <PenLine size={16} />
              Scribble on this shirt
            </button>
          )}

          {mode === 'drawing' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-ink-900 transition hover:bg-gray-50"
                title="Zoom out"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[48px] text-center text-xs font-medium text-gray-500">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-ink-900 transition hover:bg-gray-50"
                title="Zoom in"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={cancelStudio}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 transition hover:bg-gray-50"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSaveDirect}
                disabled={isSaving || !hasDrawing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </section>

      {mode === 'drawing' && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <button
              onClick={() => setTool(TOOL_TEXT)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-ink-900 transition hover:bg-gray-50"
            >
              Write my name
            </button>
            <button
              onClick={() => setTool(TOOL_PEN)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-ink-900 transition hover:bg-gray-50"
            >
              Draw something
            </button>
            <button
              onClick={() => drawingRef.current?.addEmoji(QUICK_EMOJI)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-ink-900 transition hover:bg-gray-50"
            >
              Add {QUICK_EMOJI}
            </button>
            <button
              onClick={() => {
                drawingRef.current?.clear()
                setHasDrawing(false)
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
            >
              <RotateCcw size={14} />
              Reset mark
            </button>
          </div>

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
            onPlace={handleSaveDirect}
            onEmoji={emoji => drawingRef.current?.addEmoji(emoji)}
            isPlacing={isSaving}
            canPlace={hasDrawing}
          />
        </div>
      )}

      {yearbookQuote && mode === 'browse' && (
        <p className="text-center text-xs italic text-gray-500">&ldquo;{yearbookQuote}&rdquo;</p>
      )}
    </div>
  )
}
