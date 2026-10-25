// v5 "The Table" shared types + constants (doc 26).
// Everything here is placeholder-grade: values are deterministic so SSR and
// client renders agree (no Math.random in render paths).

export type FieldKey = 'marigold' | 'cobalt' | 'forest' | 'oxblood' | 'night'

export const FIELD_HEX: Record<FieldKey, string> = {
  marigold: '#E29A2E',
  cobalt:   '#2F5FA8',
  forest:   '#3F6B4A',
  oxblood:  '#7A2E2E',
  night:    '#191410',
}

/** Dark fields flip chrome ink to paper for contrast; marigold keeps dark ink. */
export const FIELD_IS_DARK: Record<FieldKey, boolean> = {
  marigold: false,
  cobalt:   true,
  forest:   true,
  oxblood:  true,
  night:    true,
}

export type TableMarkKind = 'sticker' | 'note' | 'signature'

/**
 * A mark on the flat-lay shirt, in the canonical 400x600 shirt space.
 * Mirrors the persisted scribble/social-note model loosely on purpose —
 * Phase 3 maps these onto `scribbles` / `shirt_social_notes` rows.
 */
export interface TableMark {
  id: string
  kind: TableMarkKind
  /** public/scribbl/stickers slug, for kind === 'sticker' */
  stickerId?: string
  /** note/signature text (Caveat, content-only font) */
  text?: string
  x: number
  y: number
  width: number
  rotation: number
  /** note paper tone, for kind === 'note' */
  tone?: string
  /** set once the mark is taped down — the № counter */
  number?: number
  /** handwriting ink colour */
  color?: string
}

export const MARK_ROTATIONS = [-5, 3, -2, 6, -7, 4, 2, -4]

/** Note paper tones — recycled Sunlit Lawn sticker notes, kept quiet. */
export const NOTE_TONES = ['#FFF3B8', '#FFE1E8', '#DFF2D8', '#E3EEFB'] as const

/** The 8 marker inks (v4 marker palette = real CANVAS_COLORS). */
export const MARKER_INKS = [
  { id: 'black', hex: '#2D2923' },
  { id: 'red', hex: '#E8453C' },
  { id: 'blue', hex: '#2563EB' },
  { id: 'green', hex: '#5F8B48' },
  { id: 'purple', hex: '#7C3AED' },
  { id: 'orange', hex: '#EA580C' },
  { id: 'yellow', hex: '#D97706' },
  { id: 'teal', hex: '#0891B2' },
] as const

/** Deterministic pseudo-random rotation for placed marks. */
export function rotationFor(index: number): number {
  return MARK_ROTATIONS[index % MARK_ROTATIONS.length]
}
