'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  SHIRT_W, SHIRT_H,
  BOX_DEFAULT_SIZE, BOX_MIN_SIZE, BOX_MAX_SIZE,
} from '@/lib/constants'
import { boxesOverlap } from '@/lib/utils/collision'
import { clampScribbleBoxToCanvas, type ScribbleBox } from '@/lib/utils/scribbleContract'
import type { GhostBox } from '@/lib/hooks/useShirtChannel'
import type { Panel } from '@/lib/supabase/types'

interface ScribbleBBox {
  id: string
  x: number
  y: number
  w: number
  h: number
}

interface GhostBoxCanvasProps {
  panel: Panel
  existingScribbles: ScribbleBBox[]
  liveGhostBoxes: Map<string, GhostBox>
  textureUrl?: string
  textureVersion?: number
  onPlant: (box: ScribbleBox) => void
  onCancel: () => void
  onBoxMoved: (x: number, y: number, w: number, h: number) => void
  disabled?: boolean
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'
type DragMode = 'move' | ResizeHandle

const HANDLE_SIZE = 10
const HANDLE_HIT = 28

function initialBox(): ScribbleBox {
  return clampScribbleBoxToCanvas({
    x: (SHIRT_W - BOX_DEFAULT_SIZE) / 2,
    y: (SHIRT_H - BOX_DEFAULT_SIZE) / 2,
    w: BOX_DEFAULT_SIZE,
    h: BOX_DEFAULT_SIZE,
  })
}

function pointInBox(point: { x: number; y: number }, box: ScribbleBox): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.w &&
    point.y >= box.y &&
    point.y <= box.y + box.h
  )
}

function hitHandle(point: { x: number; y: number }, box: ScribbleBox): ResizeHandle | null {
  const { x, y, w, h } = box
  const H = HANDLE_HIT
  if (point.x >= x - H / 2 && point.x <= x + H && point.y >= y - H / 2 && point.y <= y + H) return 'nw'
  if (point.x >= x + w - H && point.x <= x + w + H / 2 && point.y >= y - H / 2 && point.y <= y + H) return 'ne'
  if (point.x >= x - H / 2 && point.x <= x + H && point.y >= y + h - H && point.y <= y + h + H / 2) return 'sw'
  if (point.x >= x + w - H && point.x <= x + w + H / 2 && point.y >= y + h - H && point.y <= y + h + H / 2) return 'se'
  return null
}

export default function GhostBoxCanvas({
  panel,
  existingScribbles,
  liveGhostBoxes,
  textureUrl,
  textureVersion = 0,
  onPlant,
  onCancel,
  onBoxMoved,
  disabled = false,
}: GhostBoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ mode: DragMode; sx: number; sy: number; box: ScribbleBox } | null>(null)

  const [box, setBox] = useState<ScribbleBox>(() => initialBox())
  const [isValid, setIsValid] = useState(false)
  const [cursor, setCursor] = useState('grab')

  useEffect(() => {
    if (!textureUrl) {
      imgRef.current = null
      return
    }

    const img = new Image()
    img.src = `${textureUrl}?v=${textureVersion}`
    img.onload = () => {
      imgRef.current = img
      draw(box, isValid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureUrl, textureVersion])

  function toCanvasCoords(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * SHIRT_W,
      y: ((clientY - rect.top) / rect.height) * SHIRT_H,
    }
  }

  const checkValid = useCallback((candidate: ScribbleBox): boolean => {
    for (const s of existingScribbles) {
      if (boxesOverlap(candidate, s)) return false
    }
    for (const [, ghost] of Array.from(liveGhostBoxes)) {
      if (ghost.panel !== panel) continue
      if (boxesOverlap(candidate, ghost)) return false
    }
    return true
  }, [existingScribbles, liveGhostBoxes, panel])

  const draw = useCallback((currentBox: ScribbleBox, currentValid: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, SHIRT_W, SHIRT_H)

    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, SHIRT_W, SHIRT_H)
    }

    ctx.fillStyle = 'rgba(80,80,80,0.12)'
    for (const s of existingScribbles) {
      ctx.fillRect(s.x, s.y, s.w, s.h)
    }

    for (const [, ghost] of Array.from(liveGhostBoxes)) {
      if (ghost.panel !== panel) continue
      ctx.save()
      ctx.fillStyle = ghost.isPlanted ? 'rgba(80,80,200,0.12)' : 'rgba(150,150,255,0.1)'
      ctx.strokeStyle = ghost.isPlanted ? 'rgba(80,80,200,0.7)' : 'rgba(150,150,255,0.6)'
      ctx.lineWidth = 1.5
      ctx.setLineDash(ghost.isPlanted ? [] : [4, 4])
      ctx.fillRect(ghost.x, ghost.y, ghost.w, ghost.h)
      ctx.strokeRect(ghost.x, ghost.y, ghost.w, ghost.h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(60,60,180,0.9)'
      ctx.font = 'bold 10px system-ui'
      ctx.fillText(ghost.displayName, ghost.x + 4, ghost.y + 13)
      ctx.restore()
    }

    const borderColor = currentValid ? '#16a34a' : '#dc2626'
    const fillColor = currentValid ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'
    const { x, y, w, h } = currentBox

    ctx.save()
    ctx.fillStyle = fillColor
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)

    ctx.fillStyle = borderColor
    const corners = [
      [x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2],
      [x + w - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2],
      [x - HANDLE_SIZE / 2, y + h - HANDLE_SIZE / 2],
      [x + w - HANDLE_SIZE / 2, y + h - HANDLE_SIZE / 2],
    ]
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, HANDLE_SIZE, HANDLE_SIZE)
    }

    ctx.fillStyle = currentValid ? 'rgba(0,0,0,0.5)' : 'rgba(180,0,0,0.65)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(currentValid ? 'Drag to position, use button to continue' : 'Move to a free area', SHIRT_W / 2, SHIRT_H - 8)
    ctx.textAlign = 'left'
    ctx.restore()
  }, [existingScribbles, liveGhostBoxes, panel])

  const commitBox = useCallback((next: ScribbleBox) => {
    const normalized = clampScribbleBoxToCanvas(next, {
      canvasW: SHIRT_W,
      canvasH: SHIRT_H,
      minSize: BOX_MIN_SIZE,
      maxSize: BOX_MAX_SIZE,
    })
    const valid = checkValid(normalized)
    setBox(normalized)
    setIsValid(valid)
    if (valid) onBoxMoved(normalized.x, normalized.y, normalized.w, normalized.h)
    return normalized
  }, [checkValid, onBoxMoved])

  useEffect(() => {
    const valid = checkValid(box)
    setIsValid(valid)
    if (valid) onBoxMoved(box.x, box.y, box.w, box.h)
  }, [box, checkValid, onBoxMoved])

  useEffect(() => {
    draw(box, isValid)
  }, [box, isValid, draw])

  const cursorForPoint = useCallback((point: { x: number; y: number }) => {
    if (disabled) return 'not-allowed'
    const handle = hitHandle(point, box)
    if (handle === 'nw' || handle === 'se') return 'nwse-resize'
    if (handle === 'ne' || handle === 'sw') return 'nesw-resize'
    return pointInBox(point, box) ? 'grab' : 'crosshair'
  }, [box, disabled])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const point = toCanvasCoords(e.clientX, e.clientY)
    const handle = hitHandle(point, box)
    const mode: DragMode = handle ?? 'move'
    let startBox = box

    if (!handle && !pointInBox(point, box)) {
      startBox = commitBox({
        x: point.x - box.w / 2,
        y: point.y - box.h / 2,
        w: box.w,
        h: box.h,
      })
    }

    dragRef.current = { mode, sx: point.x, sy: point.y, box: startBox }
    setCursor(mode === 'move' ? 'grabbing' : cursorForPoint(point))
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [box, commitBox, cursorForPoint, disabled])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const point = toCanvasCoords(e.clientX, e.clientY)

    if (!dragRef.current) {
      setCursor(cursorForPoint(point))
      return
    }

    const { mode, sx, sy, box: startBox } = dragRef.current
    const dx = point.x - sx
    const dy = point.y - sy
    let next = { ...startBox }

    if (mode === 'move') {
      next = { ...startBox, x: startBox.x + dx, y: startBox.y + dy }
    }
    if (mode === 'se') {
      next = { ...startBox, w: startBox.w + dx, h: startBox.h + dy }
    }
    if (mode === 'sw') {
      next = { ...startBox, x: startBox.x + dx, w: startBox.w - dx, h: startBox.h + dy }
    }
    if (mode === 'ne') {
      next = { ...startBox, w: startBox.w + dx, y: startBox.y + dy, h: startBox.h - dy }
    }
    if (mode === 'nw') {
      next = { ...startBox, x: startBox.x + dx, w: startBox.w - dx, y: startBox.y + dy, h: startBox.h - dy }
    }

    commitBox(next)
  }, [commitBox, cursorForPoint, disabled])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer may already be released by the browser.
    }
    const point = toCanvasCoords(e.clientX, e.clientY)
    setCursor(cursorForPoint(point))
  }, [cursorForPoint])

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none"
      style={{ aspectRatio: `${SHIRT_W}/${SHIRT_H}`, cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        width={SHIRT_W}
        height={SHIRT_H}
        className="absolute inset-0 h-full w-full rounded-lg"
      />

      <div className="absolute left-2 right-2 top-2 z-10 flex items-center justify-between gap-2">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCancel() }}
          className="rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs text-ink-900 shadow-sm transition hover:bg-white"
        >
          Cancel
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); if (isValid) onPlant(box) }}
          disabled={!isValid || disabled}
          className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this spot
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs text-ink-500 shadow-sm">
          {box.w} x {box.h} px
        </span>
      </div>
    </div>
  )
}
