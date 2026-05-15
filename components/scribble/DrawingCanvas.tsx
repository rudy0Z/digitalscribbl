'use client'

import {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react'
import {
  TOOL_PEN, TOOL_PENCIL, TOOL_TEXT, TOOL_LINE,
  TOOL_CIRCLE, TOOL_RECT, TOOL_ARROW, TOOL_ERASER, TOOL_SELECT,
  MAX_UNDO_STEPS,
} from '@/lib/constants'
import { hasDrawableFabricJson } from '@/lib/utils/scribbleContract'
import type { StrokeEvent } from '@/lib/hooks/useShirtChannel'
import type { ScribbleBox } from '@/lib/utils/scribbleContract'

export type DrawingTool =
  | typeof TOOL_PEN | typeof TOOL_PENCIL | typeof TOOL_TEXT
  | typeof TOOL_LINE | typeof TOOL_CIRCLE | typeof TOOL_RECT
  | typeof TOOL_ARROW | typeof TOOL_ERASER | typeof TOOL_SELECT

export interface DrawingCanvasRef {
  exportSvg(): string
  exportPng(): Promise<string>
  exportJson(): object
  exportLayer(): Promise<{ box: ScribbleBox; canvasJson: object; canvasSvg: string } | null>
  addEmoji(emoji: string): void
  isEmpty(): boolean
  undo(): void
  clear(): void
}

interface DrawingCanvasProps {
  w: number
  h: number
  tool: DrawingTool
  color: string
  brushSize: number
  opacity: number
  fillShapes: boolean
  fontSize: 'sm' | 'md' | 'lg'
  fontStyle: 'normal' | 'bold' | 'italic'
  onStroke: (fabricJson: object) => void
  onRemoteStroke?: (handler: (event: StrokeEvent) => void) => void
}

type FabricModule = typeof import('fabric')
type FabricCanvas = import('fabric').Canvas
type FabricObject = import('fabric').Object
type FabricEvent = { e: Event; target?: FabricObject | null; scenePoint?: Point }
type Point = { x: number; y: number }
type LiveShapeKind = typeof TOOL_LINE | typeof TOOL_RECT | typeof TOOL_CIRCLE | typeof TOOL_ARROW
type FabricRect = { left: number; top: number; width: number; height: number }

const FONT_SIZE_MAP = { sm: 14, md: 20, lg: 28 }
const MIN_SHAPE_DRAG = 3
const LAYER_PADDING = 10

function getCanvasPoint(canvas: FabricCanvas, event: FabricEvent): Point {
  const pointer = event.scenePoint ?? (canvas as unknown as {
    getScenePoint: (e: Event) => Point
  }).getScenePoint(event.e)
  return { x: pointer.x, y: pointer.y }
}

function setObjectInteractivity(canvas: FabricCanvas, selectable: boolean, evented = selectable) {
  canvas.forEachObject(object => object.set({ selectable, evented }))
}

function clampRect(rect: FabricRect, canvasW: number, canvasH: number): ScribbleBox {
  const rawLeft = Math.max(0, Math.floor(rect.left - LAYER_PADDING))
  const rawTop = Math.max(0, Math.floor(rect.top - LAYER_PADDING))
  const right = Math.min(canvasW, Math.ceil(rect.left + rect.width + LAYER_PADDING))
  const bottom = Math.min(canvasH, Math.ceil(rect.top + rect.height + LAYER_PADDING))
  const w = Math.min(canvasW, Math.max(40, right - rawLeft))
  const h = Math.min(canvasH, Math.max(40, bottom - rawTop))
  return {
    x: Math.max(0, Math.min(canvasW - w, rawLeft)),
    y: Math.max(0, Math.min(canvasH - h, rawTop)),
    w,
    h,
  }
}

function getObjectsBounds(objects: FabricObject[], canvasW: number, canvasH: number): ScribbleBox | null {
  if (objects.length === 0) return null

  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const object of objects) {
    const rect = object.getBoundingRect()
    left = Math.min(left, rect.left)
    top = Math.min(top, rect.top)
    right = Math.max(right, rect.left + rect.width)
    bottom = Math.max(bottom, rect.top + rect.height)
  }

  if (![left, top, right, bottom].every(Number.isFinite)) return null
  return clampRect({ left, top, width: right - left, height: bottom - top }, canvasW, canvasH)
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(function DrawingCanvas(
  { w, h, tool, color, brushSize, opacity, fillShapes, fontSize, fontStyle, onStroke, onRemoteStroke },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const fabricMod = useRef<FabricModule | null>(null)
  const undoStack = useRef<string[]>([])
  const isPointerDown = useRef(false)
  const liveShape = useRef<{ kind: LiveShapeKind; object: FabricObject; start: Point } | null>(null)

  const colorRef = useRef(color)
  const opacityRef = useRef(opacity)
  const fillRef = useRef(fillShapes)
  const brushSzRef = useRef(brushSize)
  const toolRef = useRef(tool)
  const onStrokeRef = useRef(onStroke)
  const fontSzRef = useRef(fontSize)
  const fontStRef = useRef(fontStyle)

  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { opacityRef.current = opacity }, [opacity])
  useEffect(() => { fillRef.current = fillShapes }, [fillShapes])
  useEffect(() => { brushSzRef.current = brushSize }, [brushSize])
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { onStrokeRef.current = onStroke }, [onStroke])
  useEffect(() => { fontSzRef.current = fontSize }, [fontSize])
  useEffect(() => { fontStRef.current = fontStyle }, [fontStyle])

  const pushSnapshot = useCallback((canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON())
    const last = undoStack.current[undoStack.current.length - 1]
    if (json === last) return
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO_STEPS - 1)), json]
  }, [])

  const commitCanvas = useCallback((canvas: FabricCanvas) => {
    pushSnapshot(canvas)
    onStrokeRef.current(canvas.toJSON())
  }, [pushSnapshot])

  const cancelLiveShape = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !liveShape.current) return
    canvas.remove(liveShape.current.object)
    liveShape.current = null
    isPointerDown.current = false
    canvas.requestRenderAll()
  }, [])

  const eraseTarget = useCallback((canvas: FabricCanvas, event: FabricEvent) => {
    const fallbackTarget = (canvas as unknown as {
      findTarget?: (e: Event, skipGroup?: boolean) => FabricObject | undefined
    }).findTarget?.(event.e, false)
    const target = event.target ?? fallbackTarget
    if (!target) return

    canvas.remove(target)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    commitCanvas(canvas)
  }, [commitCanvas])

  useEffect(() => {
    let canvas: FabricCanvas | null = null
    let disposed = false
    const host = hostRef.current
    if (!host) return

    import('fabric').then(mod => {
      if (!hostRef.current || disposed) return

      const canvasEl = document.createElement('canvas')
      canvasEl.width = w
      canvasEl.height = h
      canvasEl.style.width = '100%'
      canvasEl.style.height = '100%'
      canvasEl.style.touchAction = 'none'
      hostRef.current.replaceChildren(canvasEl)

      const liveCanvas = new mod.Canvas(canvasEl, {
        width: w,
        height: h,
        backgroundColor: undefined,
        selection: false,
        isDrawingMode: false,
        enableRetinaScaling: false,
      })

      canvas = liveCanvas
      fabricRef.current = liveCanvas
      fabricMod.current = mod
      liveCanvas.freeDrawingBrush = new mod.PencilBrush(liveCanvas)

      const canvasDom = liveCanvas as unknown as {
        wrapperEl?: HTMLElement
        upperCanvasEl?: HTMLCanvasElement
        lowerCanvasEl?: HTMLCanvasElement
      }
      for (const el of [canvasDom.wrapperEl, canvasDom.upperCanvasEl, canvasDom.lowerCanvasEl]) {
        if (!el) continue
        el.style.width = '100%'
        el.style.height = '100%'
        el.style.touchAction = 'none'
      }

      const handleMouseDown = (event: FabricEvent) => {
        const activeTool = toolRef.current

        if (activeTool === TOOL_ERASER) {
          isPointerDown.current = true
          eraseTarget(liveCanvas, event)
          return
        }

        if (
          activeTool === TOOL_PEN ||
          activeTool === TOOL_PENCIL ||
          activeTool === TOOL_SELECT
        ) {
          return
        }

        const point = getCanvasPoint(liveCanvas, event)
        const col = colorRef.current
        const strokeWidth = brushSzRef.current
        const op = opacityRef.current
        const fill = fillRef.current

        if (activeTool === TOOL_TEXT) {
          const text = new mod.IText('Type here', {
            left: point.x,
            top: point.y,
            fontSize: FONT_SIZE_MAP[fontSzRef.current],
            fontWeight: fontStRef.current === 'bold' ? 'bold' : 'normal',
            fontStyle: fontStRef.current === 'italic' ? 'italic' : 'normal',
            fill: col,
            opacity: op,
            editable: true,
            selectable: true,
            evented: true,
          })
          liveCanvas.add(text)
          liveCanvas.setActiveObject(text)
          text.enterEditing()
          text.selectAll()
          commitCanvas(liveCanvas)
          return
        }

        isPointerDown.current = true

        if (activeTool === TOOL_RECT) {
          const shape = new mod.Rect({
            left: point.x,
            top: point.y,
            width: 1,
            height: 1,
            fill: fill ? col : 'transparent',
            stroke: col,
            strokeWidth,
            opacity: op,
            selectable: false,
            evented: false,
          })
          liveCanvas.add(shape)
          liveShape.current = { kind: TOOL_RECT, object: shape, start: point }
        }

        if (activeTool === TOOL_CIRCLE) {
          const shape = new mod.Circle({
            left: point.x,
            top: point.y,
            radius: 1,
            fill: fill ? col : 'transparent',
            stroke: col,
            strokeWidth,
            opacity: op,
            selectable: false,
            evented: false,
          })
          liveCanvas.add(shape)
          liveShape.current = { kind: TOOL_CIRCLE, object: shape, start: point }
        }

        if (activeTool === TOOL_LINE || activeTool === TOOL_ARROW) {
          const shape = new mod.Line([point.x, point.y, point.x, point.y], {
            stroke: col,
            strokeWidth,
            opacity: op,
            selectable: false,
            evented: false,
          })
          liveCanvas.add(shape)
          liveShape.current = { kind: activeTool, object: shape, start: point }
        }
      }

      const handleMouseMove = (event: FabricEvent) => {
        if (toolRef.current === TOOL_ERASER && isPointerDown.current) {
          eraseTarget(liveCanvas, event)
          return
        }

        const current = liveShape.current
        if (!isPointerDown.current || !current) return

        const point = getCanvasPoint(liveCanvas, event)
        const { start, object, kind } = current

        if (kind === TOOL_RECT) {
          object.set({
            width: Math.abs(point.x - start.x),
            height: Math.abs(point.y - start.y),
            left: Math.min(point.x, start.x),
            top: Math.min(point.y, start.y),
          })
        }

        if (kind === TOOL_CIRCLE) {
          const radius = Math.hypot(point.x - start.x, point.y - start.y) / 2
          object.set({
            radius,
            left: (start.x + point.x) / 2 - radius,
            top: (start.y + point.y) / 2 - radius,
          })
        }

        if (kind === TOOL_LINE || kind === TOOL_ARROW) {
          object.set({ x2: point.x, y2: point.y })
        }

        liveCanvas.requestRenderAll()
      }

      const handleMouseUp = (event: FabricEvent) => {
        if (toolRef.current === TOOL_ERASER) {
          isPointerDown.current = false
          return
        }

        const current = liveShape.current
        if (!isPointerDown.current || !current) return

        isPointerDown.current = false
        liveShape.current = null

        const end = getCanvasPoint(liveCanvas, event)
        const { start, object, kind } = current
        const distance = Math.hypot(end.x - start.x, end.y - start.y)

        if (distance < MIN_SHAPE_DRAG) {
          liveCanvas.remove(object)
          liveCanvas.requestRenderAll()
          return
        }

        if (kind === TOOL_ARROW) {
          liveCanvas.remove(object)

          const angle = Math.atan2(end.y - start.y, end.x - start.x)
          const angleDeg = angle * (180 / Math.PI)
          const strokeWidth = brushSzRef.current
          const headSize = Math.max(12, strokeWidth * 4)
          const col = colorRef.current
          const op = opacityRef.current
          const lineEndX = end.x - headSize * 0.7 * Math.cos(angle)
          const lineEndY = end.y - headSize * 0.7 * Math.sin(angle)

          const lineObj = new mod.Line([start.x, start.y, lineEndX, lineEndY], {
            stroke: col,
            strokeWidth,
            selectable: false,
            evented: false,
          })
          const head = new mod.Triangle({
            left: end.x,
            top: end.y,
            width: headSize,
            height: headSize * 1.3,
            fill: col,
            angle: angleDeg + 90,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })
          const arrow = new mod.Group([lineObj, head], {
            opacity: op,
            selectable: false,
            evented: false,
          })
          liveCanvas.add(arrow)
        }

        liveCanvas.requestRenderAll()
        commitCanvas(liveCanvas)
      }

      liveCanvas.on('mouse:down', handleMouseDown)
      liveCanvas.on('mouse:move', handleMouseMove)
      liveCanvas.on('mouse:up', handleMouseUp)

      liveCanvas.on('path:created', ({ path }) => {
        path.set({ opacity: opacityRef.current, selectable: false, evented: false })
        liveCanvas.requestRenderAll()
        commitCanvas(liveCanvas)
      })

      liveCanvas.on('text:editing:exited', () => {
        commitCanvas(liveCanvas)
      })

      liveCanvas.on('object:modified', () => {
        commitCanvas(liveCanvas)
      })

      if (onRemoteStroke) {
        onRemoteStroke(({ fabricJson }) => {
          if (disposed) return
          void liveCanvas.loadFromJSON(fabricJson).then(() => liveCanvas.renderAll())
        })
      }

      pushSnapshot(liveCanvas)
    })

    return () => {
      disposed = true
      try {
        canvas?.dispose()
      } catch {
        // Fabric cleanup should not block React unmount.
      }
      canvas = null
      fabricRef.current = null
      fabricMod.current = null
      liveShape.current = null
      isPointerDown.current = false
      host.replaceChildren()
    }
  }, [w, h, onRemoteStroke, commitCanvas, eraseTarget, pushSnapshot])

  useEffect(() => {
    const canvas = fabricRef.current
    const mod = fabricMod.current
    if (!canvas || !mod) return

    cancelLiveShape()

    canvas.isDrawingMode = false
    canvas.selection = false
    canvas.defaultCursor = 'crosshair'
    canvas.hoverCursor = 'crosshair'
    setObjectInteractivity(canvas, false)

    if (tool === TOOL_SELECT) {
      canvas.selection = true
      canvas.defaultCursor = 'default'
      canvas.hoverCursor = 'move'
      setObjectInteractivity(canvas, true)
      canvas.renderAll()
      return
    }

    if (tool === TOOL_ERASER) {
      canvas.defaultCursor = 'not-allowed'
      canvas.hoverCursor = 'not-allowed'
      setObjectInteractivity(canvas, false, true)
      canvas.renderAll()
      return
    }

    if (tool === TOOL_PEN || tool === TOOL_PENCIL) {
      const brush = new mod.PencilBrush(canvas)
      brush.color = color
      brush.width = brushSize
      if (tool === TOOL_PENCIL) {
        ;(brush as unknown as { decimate: number }).decimate = 10
      }
      canvas.freeDrawingBrush = brush
      canvas.isDrawingMode = true
      canvas.defaultCursor = 'crosshair'
      canvas.hoverCursor = 'crosshair'
      canvas.renderAll()
      return
    }

    canvas.renderAll()
  }, [tool, color, brushSize, cancelLiveShape])

  useImperativeHandle(ref, () => ({
    exportSvg: () => {
      const canvas = fabricRef.current
      if (!canvas) return ''
      return canvas.toSVG()
    },
    exportPng: async () => {
      const canvas = fabricRef.current
      if (!canvas) return ''
      return canvas.toDataURL({ format: 'png', multiplier: 1 }).split(',')[1]
    },
    exportJson: () => fabricRef.current?.toJSON() ?? {},
    exportLayer: async () => {
      const canvas = fabricRef.current
      const mod = fabricMod.current
      if (!canvas || !mod) return null

      const objects = canvas.getObjects().filter(object => {
        const json = object.toObject() as Record<string, unknown>
        return json.visible !== false && json.opacity !== 0
      })
      const box = getObjectsBounds(objects, w, h)
      if (!box) return null

      const canvasEl = document.createElement('canvas')
      canvasEl.width = box.w
      canvasEl.height = box.h
      const layerCanvas = new mod.StaticCanvas(canvasEl, {
        width: box.w,
        height: box.h,
        backgroundColor: undefined,
        enableRetinaScaling: false,
      })

      for (const object of objects) {
        const cloned = await object.clone()
        cloned.set({
          left: Number(cloned.left ?? 0) - box.x,
          top: Number(cloned.top ?? 0) - box.y,
        })
        layerCanvas.add(cloned)
      }

      layerCanvas.renderAll()
      const canvasJson = layerCanvas.toJSON()
      const canvasSvg = layerCanvas.toSVG()
      layerCanvas.dispose()
      return { box, canvasJson, canvasSvg }
    },
    addEmoji: (emoji: string) => {
      const canvas = fabricRef.current
      const mod = fabricMod.current
      if (!canvas || !mod) return
      cancelLiveShape()
      const text = new mod.Text(emoji, {
        left: Math.max(18, Math.min(w - 58, w / 2 - 28)),
        top: Math.max(18, Math.min(h - 58, h / 2 - 28)),
        fontSize: 42,
        fill: colorRef.current,
        opacity: opacityRef.current,
        selectable: true,
        evented: true,
      })
      canvas.add(text)
      canvas.setActiveObject(text)
      canvas.requestRenderAll()
      commitCanvas(canvas)
    },
    isEmpty: () => !hasDrawableFabricJson(fabricRef.current?.toJSON() ?? {}),
    undo: () => {
      const canvas = fabricRef.current
      if (!canvas || undoStack.current.length <= 1) return
      undoStack.current.pop()
      const previous = undoStack.current[undoStack.current.length - 1]
      void canvas.loadFromJSON(JSON.parse(previous)).then(() => {
        canvas.renderAll()
        onStrokeRef.current(canvas.toJSON())
      })
    },
    clear: () => {
      const canvas = fabricRef.current
      if (!canvas) return
      cancelLiveShape()
      canvas.clear()
      canvas.discardActiveObject()
      canvas.renderAll()
      commitCanvas(canvas)
    },
  }))

  return (
    <div
      ref={hostRef}
      className="h-full w-full overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  )
})

export default DrawingCanvas
