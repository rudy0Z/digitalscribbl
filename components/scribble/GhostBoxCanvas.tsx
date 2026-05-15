'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  SHIRT_W, SHIRT_H,
  BOX_DEFAULT_SIZE, BOX_MIN_SIZE, BOX_MAX_SIZE,
} from '@/lib/constants'
import { clampToCanvas, boxesOverlap } from '@/lib/utils/collision'
import type { GhostBox } from '@/lib/hooks/useShirtChannel'
import type { Panel } from '@/lib/supabase/types'

// ── Types ────────────────────────────────────────────────────

interface ScribbleBBox {
  id:    string
  x:     number
  y:     number
  w:     number
  h:     number
}

interface PlacedBox {
  x: number
  y: number
  w: number
  h: number
}

interface GhostBoxCanvasProps {
  panel:               Panel
  existingScribbles:   ScribbleBBox[]
  liveGhostBoxes:      Map<string, GhostBox>
  textureUrl?:         string
  textureVersion?:     number
  onPlant:             (box: PlacedBox) => void
  onCancel:            () => void
  onBoxMoved:          (x: number, y: number, w: number, h: number) => void
  disabled?:           boolean
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | null

const HANDLE_HIT = 14  // px hit area in canvas coords

// ── Component ────────────────────────────────────────────────

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
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement | null>(null)

  const [box,        setBox]        = useState<PlacedBox>({ x: 100, y: 100, w: BOX_DEFAULT_SIZE, h: BOX_DEFAULT_SIZE })
  const [isValid,    setIsValid]    = useState(false)
  const [resizing,   setResizing]   = useState<ResizeHandle>(null)
  const resizeStart  = useRef<{ mx: number; my: number; box: PlacedBox } | null>(null)

  // Preload shirt texture
  useEffect(() => {
    if (!textureUrl) return
    const img    = new Image()
    img.src      = `${textureUrl}?v=${textureVersion}`
    img.onload   = () => {
      imgRef.current = img
      draw(box, isValid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureUrl, textureVersion])

  // ── Coordinate mapping ────────────────────────────────────
  function toCanvasCoords(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width)  * SHIRT_W,
      y: ((clientY - rect.top)  / rect.height) * SHIRT_H,
    }
  }

  // ── Collision check ───────────────────────────────────────
  const checkValid = useCallback((candidate: PlacedBox): boolean => {
    for (const s of existingScribbles) {
      if (boxesOverlap(candidate, s)) return false
    }
    for (const [, ghost] of Array.from(liveGhostBoxes)) {
      if (ghost.panel !== panel) continue
      if (boxesOverlap(candidate, ghost)) return false
    }
    return true
  }, [existingScribbles, liveGhostBoxes, panel])

  // ── Draw ──────────────────────────────────────────────────
  const draw = useCallback((currentBox: PlacedBox, currentValid: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, SHIRT_W, SHIRT_H)

    // Shirt texture
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, SHIRT_W, SHIRT_H)
    }

    // Existing scribble overlays (occupied areas)
    ctx.fillStyle = 'rgba(80,80,80,0.12)'
    for (const s of existingScribbles) {
      ctx.fillRect(s.x, s.y, s.w, s.h)
    }

    // Other users' ghost boxes
    for (const [, ghost] of Array.from(liveGhostBoxes)) {
      if (ghost.panel !== panel) continue
      const isPlanted = ghost.isPlanted

      ctx.save()
      ctx.fillStyle   = isPlanted ? 'rgba(80,80,200,0.12)' : 'rgba(150,150,255,0.1)'
      ctx.strokeStyle = isPlanted ? 'rgba(80,80,200,0.7)'  : 'rgba(150,150,255,0.6)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash(isPlanted ? [] : [4, 4])
      ctx.fillRect(ghost.x, ghost.y, ghost.w, ghost.h)
      ctx.strokeRect(ghost.x, ghost.y, ghost.w, ghost.h)
      ctx.setLineDash([])

      // Name label
      ctx.fillStyle = 'rgba(60,60,180,0.9)'
      ctx.font      = 'bold 10px system-ui'
      ctx.fillText(ghost.displayName, ghost.x + 4, ghost.y + 13)
      ctx.restore()
    }

    // My ghost box
    const borderColor = currentValid ? '#16a34a' : '#dc2626'
    const fillColor   = currentValid ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)'

    ctx.save()
    ctx.fillStyle   = fillColor
    ctx.strokeStyle = borderColor
    ctx.lineWidth   = 2
    ctx.fillRect(currentBox.x, currentBox.y, currentBox.w, currentBox.h)
    ctx.strokeRect(currentBox.x, currentBox.y, currentBox.w, currentBox.h)

    // Resize handles (4 corners)
    ctx.fillStyle = borderColor
    const { x, y, w: bw, h: bh } = currentBox
    const corners = [
      [x,          y         ],
      [x + bw - 8, y         ],
      [x,          y + bh - 8],
      [x + bw - 8, y + bh - 8],
    ]
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, 8, 8)
    }

    // Hint text
    if (currentValid) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.font      = '11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Click to plant', SHIRT_W / 2, SHIRT_H - 8)
    } else {
      ctx.fillStyle = 'rgba(180,0,0,0.6)'
      ctx.font      = '11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Move to a free area', SHIRT_W / 2, SHIRT_H - 8)
    }
    ctx.textAlign = 'left'
    ctx.restore()
  }, [existingScribbles, liveGhostBoxes, panel])

  // Redraw whenever state changes
  useEffect(() => {
    draw(box, isValid)
  }, [box, isValid, draw, liveGhostBoxes, existingScribbles])

  // ── Detect which resize handle was clicked ────────────────
  function hitHandle(mx: number, my: number, b: PlacedBox): ResizeHandle {
    const { x, y, w: bw, h: bh } = b
    const H = HANDLE_HIT
    if (mx >= x          && mx <= x + H      && my >= y          && my <= y + H     ) return 'nw'
    if (mx >= x + bw - H && mx <= x + bw     && my >= y          && my <= y + H     ) return 'ne'
    if (mx >= x          && mx <= x + H      && my >= y + bh - H && my <= y + bh    ) return 'sw'
    if (mx >= x + bw - H && mx <= x + bw     && my >= y + bh - H && my <= y + bh    ) return 'se'
    return null
  }

  // ── Mouse handlers ────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    const { x: mx, y: my } = toCanvasCoords(e.clientX, e.clientY)
    const handle = hitHandle(mx, my, box)
    if (handle) {
      setResizing(handle)
      resizeStart.current = { mx, my, box: { ...box } }
      e.preventDefault()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, disabled])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    const { x: mx, y: my } = toCanvasCoords(e.clientX, e.clientY)

    if (resizing && resizeStart.current) {
      const { mx: sx, my: sy, box: sb } = resizeStart.current
      const dx = mx - sx
      const dy = my - sy
      let nb = { ...sb }

      if (resizing === 'se') { nb.w = sb.w + dx; nb.h = sb.h + dy }
      if (resizing === 'sw') { nb.x = sb.x + dx; nb.w = sb.w - dx; nb.h = sb.h + dy }
      if (resizing === 'ne') { nb.w = sb.w + dx; nb.y = sb.y + dy; nb.h = sb.h - dy }
      if (resizing === 'nw') { nb.x = sb.x + dx; nb.w = sb.w - dx; nb.y = sb.y + dy; nb.h = sb.h - dy }

      nb = clampToCanvas(nb, SHIRT_W, SHIRT_H, BOX_MIN_SIZE, BOX_MAX_SIZE)
      const valid = checkValid(nb)
      setBox(nb)
      setIsValid(valid)
      if (valid) onBoxMoved(nb.x, nb.y, nb.w, nb.h)
      return
    }

    // Follow cursor
    const nb = clampToCanvas(
      { x: mx - box.w / 2, y: my - box.h / 2, w: box.w, h: box.h },
      SHIRT_W, SHIRT_H, BOX_MIN_SIZE, BOX_MAX_SIZE
    )
    const valid = checkValid(nb)
    setBox(nb)
    setIsValid(valid)
    if (valid) onBoxMoved(nb.x, nb.y, nb.w, nb.h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing, box.w, box.h, checkValid, onBoxMoved, disabled])

  const handleMouseUp = useCallback(() => {
    setResizing(null)
    resizeStart.current = null
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || resizing) return
    const { x: mx, y: my } = toCanvasCoords(e.clientX, e.clientY)
    if (hitHandle(mx, my, box)) return  // was a resize
    if (isValid) onPlant(box)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, resizing, box, isValid, onPlant])

  // Cursor style based on handle proximity
  function cursorStyle(e: React.MouseEvent): string {
    if (disabled) return 'not-allowed'
    const { x: mx, y: my } = toCanvasCoords(e.clientX, e.clientY)
    const h = hitHandle(mx, my, box)
    if (h === 'nw' || h === 'se') return 'nw-resize'
    if (h === 'ne' || h === 'sw') return 'ne-resize'
    return isValid ? 'crosshair' : 'not-allowed'
  }
  const [cursor, setCursor] = useState('crosshair')

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ aspectRatio: `${SHIRT_W}/${SHIRT_H}`, cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={e => { handleMouseMove(e); setCursor(cursorStyle(e)) }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={SHIRT_W}
        height={SHIRT_H}
        className="absolute inset-0 w-full h-full rounded-lg"
      />

      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onCancel() }}
        className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white text-ink-900 text-xs px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition"
      >
        Cancel
      </button>

      {/* Resize size hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-xs text-ink-500 bg-white/80 px-2 py-0.5 rounded-full">
          {box.w} × {box.h} px — drag corners to resize
        </span>
      </div>
    </div>
  )
}
