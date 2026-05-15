// ── Bounding Box Collision Detection ─────────────────────────
// Used on both client (real-time UX) and server (commit validation).
// Axis-Aligned Bounding Box (AABB) intersection test.

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

/** Returns true if two bounding boxes overlap (any edge touching is NOT a collision). */
export function boxesOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.w <= b.x ||   // a is entirely left of b
    a.x       >= b.x + b.w ||  // a is entirely right of b
    a.y + a.h <= b.y ||   // a is entirely above b
    a.y       >= b.y + b.h    // a is entirely below b
  )
}

/** Returns true if `candidate` overlaps any box in `existing`. */
export function hasCollision(candidate: BBox, existing: BBox[]): boolean {
  return existing.some(b => boxesOverlap(candidate, b))
}

/** Returns the subset of boxes that overlap `candidate`. */
export function getCollisions(candidate: BBox, existing: BBox[]): BBox[] {
  return existing.filter(b => boxesOverlap(candidate, b))
}

/** Clamp a box so it stays within the shirt canvas boundaries. */
export function clampToCanvas(
  box: BBox,
  canvasW: number,
  canvasH: number,
  minSize: number,
  maxSize: number
): BBox {
  const w = Math.max(minSize, Math.min(maxSize, box.w))
  const h = Math.max(minSize, Math.min(maxSize, box.h))
  const x = Math.max(0, Math.min(canvasW - w, box.x))
  const y = Math.max(0, Math.min(canvasH - h, box.y))
  return { x, y, w, h }
}

/**
 * Calculate how much of the canvas is occupied by bounding boxes.
 * Returns a percentage 0–100.
 */
export function calculateOccupancy(
  boxes: BBox[],
  canvasW: number,
  canvasH: number
): number {
  const totalBoxArea = boxes.reduce((sum, b) => sum + b.w * b.h, 0)
  return Math.min(100, (totalBoxArea / (canvasW * canvasH)) * 100)
}
