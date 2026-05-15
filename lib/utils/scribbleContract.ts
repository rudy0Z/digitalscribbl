import {
  BOX_MAX_SIZE,
  BOX_MIN_SIZE,
  SHIRT_H,
  SHIRT_W,
} from '../constants.ts'

export interface ScribbleBox {
  x: number
  y: number
  w: number
  h: number
}

interface ScribbleBoxLimits {
  canvasW?: number
  canvasH?: number
  minSize?: number
  maxSize?: number
}

export type ScribbleBoxResult =
  | { ok: true; box: ScribbleBox }
  | { ok: false; code: 'INVALID_BOX'; error: string }

const DEFAULT_LIMITS: Required<ScribbleBoxLimits> = {
  canvasW: SHIRT_W,
  canvasH: SHIRT_H,
  minSize: BOX_MIN_SIZE,
  maxSize: BOX_MAX_SIZE,
}

function withDefaults(limits: ScribbleBoxLimits = {}): Required<ScribbleBoxLimits> {
  return { ...DEFAULT_LIMITS, ...limits }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function readRawBox(input: unknown): ScribbleBoxResult {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      code: 'INVALID_BOX',
      error: 'Bounding box values must be finite numbers',
    }
  }

  const box = input as Partial<Record<keyof ScribbleBox, unknown>>
  const { x, y, w, h } = box
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h)) {
    return {
      ok: false,
      code: 'INVALID_BOX',
      error: 'Bounding box values must be finite numbers',
    }
  }

  return {
    ok: true,
    box: {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    },
  }
}

export function normalizeScribbleBox(
  input: unknown,
  limits?: ScribbleBoxLimits,
): ScribbleBoxResult {
  const raw = readRawBox(input)
  if (!raw.ok) return raw

  const { canvasW, canvasH, minSize, maxSize } = withDefaults(limits)
  const { x, y, w, h } = raw.box

  if (w < minSize || w > maxSize || h < minSize || h > maxSize) {
    return {
      ok: false,
      code: 'INVALID_BOX',
      error: 'Bounding box size out of bounds',
    }
  }

  if (x < 0 || y < 0 || x + w > canvasW || y + h > canvasH) {
    return {
      ok: false,
      code: 'INVALID_BOX',
      error: 'Bounding box out of canvas bounds',
    }
  }

  return { ok: true, box: { x, y, w, h } }
}

export function clampScribbleBoxToCanvas(
  input: ScribbleBox,
  limits?: ScribbleBoxLimits,
): ScribbleBox {
  const { canvasW, canvasH, minSize, maxSize } = withDefaults(limits)
  const w = clamp(Math.round(input.w), minSize, maxSize)
  const h = clamp(Math.round(input.h), minSize, maxSize)
  const x = clamp(Math.round(input.x), 0, canvasW - w)
  const y = clamp(Math.round(input.y), 0, canvasH - h)

  return { x, y, w, h }
}

function hasDrawableObject(object: unknown): boolean {
  if (!object || typeof object !== 'object') return false

  const record = object as Record<string, unknown>
  if (record.visible === false || record.opacity === 0) return false

  const children = record.objects
  if (Array.isArray(children)) return children.some(hasDrawableObject)

  const type = String(record.type ?? '').toLowerCase()
  if (type.includes('text')) {
    return typeof record.text === 'string' && record.text.trim().length > 0
  }

  return type.length > 0
}

export function hasDrawableFabricJson(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false
  const objects = (input as { objects?: unknown }).objects
  return Array.isArray(objects) && objects.some(hasDrawableObject)
}
