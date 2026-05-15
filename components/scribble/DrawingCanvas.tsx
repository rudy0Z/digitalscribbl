'use client'

import {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react'
import {
  TOOL_PEN, TOOL_PENCIL, TOOL_TEXT, TOOL_LINE,
  TOOL_CIRCLE, TOOL_RECT, TOOL_ARROW, TOOL_ERASER, TOOL_SELECT,
  MAX_UNDO_STEPS,
} from '@/lib/constants'
import type { StrokeEvent } from '@/lib/hooks/useShirtChannel'

// ── Types ─────────────────────────────────────────────────────

export type DrawingTool =
  | typeof TOOL_PEN    | typeof TOOL_PENCIL | typeof TOOL_TEXT
  | typeof TOOL_LINE   | typeof TOOL_CIRCLE | typeof TOOL_RECT
  | typeof TOOL_ARROW  | typeof TOOL_ERASER | typeof TOOL_SELECT

export interface DrawingCanvasRef {
  exportSvg():  string           // SVG string (vector, preferred)
  exportPng():  Promise<string>  // base64 PNG (legacy, kept for fallback)
  exportJson(): object           // Fabric.js canvas JSON
  undo():       void
  clear():      void
}

interface DrawingCanvasProps {
  w:          number
  h:          number
  tool:       DrawingTool
  color:      string
  brushSize:  number
  opacity:    number          // 0.1 – 1
  fillShapes: boolean         // solid fill vs outline-only
  fontSize:   'sm' | 'md' | 'lg'
  fontStyle:  'normal' | 'bold' | 'italic'
  onStroke:   (fabricJson: object) => void
  onRemoteStroke?: (handler: (event: StrokeEvent) => void) => void
}

const FONT_SIZE_MAP = { sm: 14, md: 20, lg: 28 }

/** Convert a pointer/mouse event position to canvas-pixel coords. */
function getPoint(
  e: { clientX: number; clientY: number },
  el: HTMLElement,
  w: number,
  h: number,
): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) / r.width)  * w,
    y: ((e.clientY - r.top)  / r.height) * h,
  }
}

// ── Component ─────────────────────────────────────────────────

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(function DrawingCanvas(
  { w, h, tool, color, brushSize, opacity, fillShapes, fontSize, fontStyle, onStroke, onRemoteStroke },
  ref,
) {
  const domRef      = useRef<HTMLCanvasElement>(null)
  const fabricRef   = useRef<import('fabric').Canvas | null>(null)
  const fabricMod   = useRef<typeof import('fabric') | null>(null)
  const undoStack   = useRef<string[]>([])
  const isPtrDown   = useRef(false)
  const startPt     = useRef<{ x: number; y: number } | null>(null)
  const liveShape   = useRef<import('fabric').Object | null>(null)

  // Stable refs — readable inside Fabric event callbacks that are set up once
  const colorRef     = useRef(color)
  const opacityRef   = useRef(opacity)
  const fillRef      = useRef(fillShapes)
  const brushSzRef   = useRef(brushSize)
  const toolRef      = useRef(tool)
  const onStrokeRef  = useRef(onStroke)
  const fontSzRef    = useRef(fontSize)
  const fontStRef    = useRef(fontStyle)

  useEffect(() => { colorRef.current    = color      }, [color])
  useEffect(() => { opacityRef.current  = opacity    }, [opacity])
  useEffect(() => { fillRef.current     = fillShapes }, [fillShapes])
  useEffect(() => { brushSzRef.current  = brushSize  }, [brushSize])
  useEffect(() => { toolRef.current     = tool       }, [tool])
  useEffect(() => { onStrokeRef.current = onStroke   }, [onStroke])
  useEffect(() => { fontSzRef.current   = fontSize   }, [fontSize])
  useEffect(() => { fontStRef.current   = fontStyle  }, [fontStyle])

  const snapshot = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON())
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO_STEPS - 1)), json]
  }, [])

  // ── Fabric.js init (runs once on mount) ───────────────────
  useEffect(() => {
    let canvas: import('fabric').Canvas | null = null
    let disposed = false

    import('fabric').then(mod => {
      if (!domRef.current || disposed) return
      fabricMod.current = mod
      domRef.current.removeAttribute('data-fabric')
      domRef.current.classList.remove('lower-canvas')

      const liveCanvas = new mod.Canvas(domRef.current, {
        width:               w,
        height:              h,
        backgroundColor:     undefined,   // transparent
        selection:           false,
        isDrawingMode:       false,
        enableRetinaScaling: false,
      })
      canvas = liveCanvas

      liveCanvas.freeDrawingBrush = new mod.PencilBrush(liveCanvas)
      fabricRef.current           = liveCanvas

      // Freehand stroke finished → apply opacity, snapshot, broadcast
      liveCanvas.on('path:created', ({ path }) => {
        path.set('opacity', opacityRef.current)
        liveCanvas.renderAll()
        snapshot()
        onStrokeRef.current(liveCanvas.toJSON())
      })

      // Text edit exited
      liveCanvas.on('text:editing:exited', () => {
        snapshot()
        onStrokeRef.current(liveCanvas.toJSON())
      })

      // Object moved / resized in select mode
      liveCanvas.on('object:modified', () => {
        snapshot()
        onStrokeRef.current(liveCanvas.toJSON())
      })

      // Remote strokes (collaborative — same box, future use)
      if (onRemoteStroke) {
        onRemoteStroke(({ fabricJson }) => {
          if (disposed) return
          liveCanvas.loadFromJSON(fabricJson, () => liveCanvas.renderAll())
        })
      }

      snapshot() // empty initial state
    })

    return () => {
      disposed = true
      try { canvas?.dispose() } catch { /* ignore */ }
      canvas = null
      fabricRef.current = null
      fabricMod.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync tool / color / brushSize → configure Fabric ──────
  useEffect(() => {
    const canvas = fabricRef.current
    const mod    = fabricMod.current
    if (!canvas || !mod) return

    // Cancel any in-progress shape draw
    isPtrDown.current = false
    if (liveShape.current) {
      canvas.remove(liveShape.current)
      liveShape.current = null
    }
    startPt.current = null

    // ── Select mode ─────────────────────────────────────────
    if (tool === TOOL_SELECT) {
      canvas.isDrawingMode = false
      canvas.selection     = true
      canvas.forEachObject(o => o.set({ selectable: true, evented: true }))
      canvas.renderAll()
      return
    }

    // Non-select: lock all objects
    canvas.selection = false
    canvas.forEachObject(o => o.set({ selectable: false, evented: false }))
    canvas.discardActiveObject()

    // ── Freehand modes ───────────────────────────────────────
    if (tool === TOOL_PEN || tool === TOOL_PENCIL) {
      canvas.isDrawingMode = true
      const brush = new mod.PencilBrush(canvas)
      brush.color = color
      brush.width = brushSize
      if (tool === TOOL_PENCIL) {
        // Rougher: less smoothing
        ;(brush as unknown as { decimate: number }).decimate = 10
      }
      canvas.freeDrawingBrush = brush
      canvas.renderAll()
      return
    }

    if (tool === TOOL_ERASER) {
      canvas.isDrawingMode = true
      // Try Fabric 6.x EraserBrush; fall back to white-paint erase
      const FabAny = mod as Record<string, unknown>
      if (typeof FabAny['EraserBrush'] === 'function') {
        const EraserBrushClass = FabAny['EraserBrush'] as new (c: import('fabric').Canvas) => import('fabric').BaseBrush
        const eraser           = new EraserBrushClass(canvas)
        eraser.width           = brushSize * 3
        canvas.freeDrawingBrush = eraser
      } else {
        const brush = new mod.PencilBrush(canvas)
        brush.color = '#FFFFFF'
        brush.width = brushSize * 3
        canvas.freeDrawingBrush = brush
      }
      canvas.renderAll()
      return
    }

    // Shape / text tools: turn off freehand
    canvas.isDrawingMode = false
    canvas.renderAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, brushSize])

  // ── Pointer down (shapes + text) ─────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = fabricRef.current
    const mod    = fabricMod.current
    if (!canvas || !mod) return

    const t = toolRef.current
    // Fabric handles freehand and selection natively
    if (t === TOOL_PEN || t === TOOL_PENCIL || t === TOOL_ERASER || t === TOOL_SELECT) return

    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPoint(e, e.currentTarget, w, h)
    startPt.current   = pt
    isPtrDown.current = true

    const col  = colorRef.current
    const sz   = brushSzRef.current
    const op   = opacityRef.current
    const fill = fillRef.current

    if (t === TOOL_TEXT) {
      const text = new mod.IText('Type here', {
        left:       pt.x,
        top:        pt.y,
        fontSize:   FONT_SIZE_MAP[fontSzRef.current],
        fontWeight: fontStRef.current === 'bold'   ? 'bold'   : 'normal',
        fontStyle:  fontStRef.current === 'italic' ? 'italic' : 'normal',
        fill:       col,
        opacity:    op,
        editable:   true,
        selectable: false,
        evented:    false,
      })
      canvas.add(text)
      canvas.setActiveObject(text)
      text.enterEditing()
      text.selectAll()
      isPtrDown.current = false
      return
    }

    if (t === TOOL_RECT) {
      const shape = new mod.Rect({
        left: pt.x, top: pt.y, width: 1, height: 1,
        fill:        fill ? col : 'transparent',
        stroke:      col,
        strokeWidth: sz,
        opacity:     op,
        selectable:  false,
        evented:     false,
      })
      canvas.add(shape)
      liveShape.current = shape
    }

    if (t === TOOL_CIRCLE) {
      const shape = new mod.Circle({
        left: pt.x, top: pt.y, radius: 1,
        fill:        fill ? col : 'transparent',
        stroke:      col,
        strokeWidth: sz,
        opacity:     op,
        selectable:  false,
        evented:     false,
      })
      canvas.add(shape)
      liveShape.current = shape
    }

    if (t === TOOL_LINE || t === TOOL_ARROW) {
      const shape = new mod.Line([pt.x, pt.y, pt.x, pt.y], {
        stroke:      col,
        strokeWidth: sz,
        opacity:     op,
        selectable:  false,
        evented:     false,
      })
      canvas.add(shape)
      liveShape.current = shape
    }
  }, [w, h])

  // ── Pointer move (live shape preview) ────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = fabricRef.current
    const mod    = fabricMod.current
    if (!canvas || !mod || !isPtrDown.current || !liveShape.current || !startPt.current) return

    const pt    = getPoint(e, e.currentTarget, w, h)
    const shape = liveShape.current

    if (shape instanceof mod.Rect) {
      shape.set({
        width:  Math.abs(pt.x - startPt.current.x),
        height: Math.abs(pt.y - startPt.current.y),
        left:   Math.min(pt.x, startPt.current.x),
        top:    Math.min(pt.y, startPt.current.y),
      })
    } else if (shape instanceof mod.Circle) {
      const r = Math.hypot(pt.x - startPt.current.x, pt.y - startPt.current.y) / 2
      shape.set({
        radius: r,
        left:   (startPt.current.x + pt.x) / 2 - r,
        top:    (startPt.current.y + pt.y) / 2 - r,
      })
    } else if (shape instanceof mod.Line) {
      shape.set({ x2: pt.x, y2: pt.y })
    }

    canvas.renderAll()
  }, [w, h])

  // ── Pointer up (finalize shape) ───────────────────────────
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = fabricRef.current
    const mod    = fabricMod.current
    if (!canvas || !mod || !isPtrDown.current) return

    isPtrDown.current = false
    const t   = toolRef.current
    const end = getPoint(e, e.currentTarget, w, h)

    // ── Arrow: replace live Line with Line + Triangle Group ─
    if (t === TOOL_ARROW && liveShape.current instanceof mod.Line && startPt.current) {
      const sx = startPt.current.x, sy = startPt.current.y
      const ex = end.x, ey = end.y

      canvas.remove(liveShape.current)
      liveShape.current = null

      const angle    = Math.atan2(ey - sy, ex - sx)
      const angleDeg = angle * (180 / Math.PI)
      const col      = colorRef.current
      const sz       = brushSzRef.current
      const op       = opacityRef.current
      const headSize = Math.max(12, sz * 4)

      // Shorten line so it doesn't poke through the arrowhead
      const lx2 = ex - headSize * 0.7 * Math.cos(angle)
      const ly2 = ey - headSize * 0.7 * Math.sin(angle)

      const lineObj = new mod.Line([sx, sy, lx2, ly2], {
        stroke: col, strokeWidth: sz,
        selectable: false, evented: false,
      })
      const head = new mod.Triangle({
        left: ex, top: ey,
        width: headSize, height: headSize * 1.3,
        fill: col,
        angle: angleDeg + 90,   // Fabric 0° = pointing up; +90 → pointing along arrow
        originX: 'center', originY: 'center',
        selectable: false, evented: false,
      })
      const arrow = new mod.Group([lineObj, head], {
        opacity:    op,
        selectable: false,
        evented:    false,
      })
      canvas.add(arrow)
    } else {
      liveShape.current = null
    }

    startPt.current = null
    canvas.renderAll()
    snapshot()
    onStrokeRef.current(canvas.toJSON())
  }, [w, h, snapshot])

  // ── Ref API ───────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportSvg: () => {
      const canvas = fabricRef.current
      if (!canvas) return ''
      // Fabric.js toSVG() returns a clean SVG string with transparent background
      return canvas.toSVG()
    },
    exportPng: async () => {
      const canvas = fabricRef.current
      if (!canvas) return ''
      return canvas.toDataURL({ format: 'png', multiplier: 1 }).split(',')[1]
    },
    exportJson: () => fabricRef.current?.toJSON() ?? {},
    undo: () => {
      if (undoStack.current.length <= 1) return
      undoStack.current.pop()
      const prev = undoStack.current[undoStack.current.length - 1]
      fabricRef.current?.loadFromJSON(JSON.parse(prev), () => {
        fabricRef.current?.renderAll()
        onStrokeRef.current(fabricRef.current?.toJSON() ?? {})
      })
    },
    clear: () => {
      snapshot()
      fabricRef.current?.clear()
      fabricRef.current?.renderAll()
      onStrokeRef.current({})
    },
  }))

  return (
    <canvas
      ref={domRef}
      width={w}
      height={h}
      className="w-full h-full"
      style={{ touchAction: 'none' }}   // prevents page scroll on touch
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}  // cancel on leave
    />
  )
})

export default DrawingCanvas
