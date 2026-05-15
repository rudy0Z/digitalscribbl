// ── Shirt Canvas ─────────────────────────────────────────────
// Server-side compositing dimensions. Do NOT change after launch
// without migrating existing texture images.
export const SHIRT_W = 400
export const SHIRT_H = 600

// Shirt panels dimensions (all same size for simplicity)
export const PANEL_AREA = SHIRT_W * SHIRT_H  // 240 000 px²

// ── Bounding Box ─────────────────────────────────────────────
export const BOX_DEFAULT_SIZE = 140
export const BOX_MIN_SIZE = 40
export const BOX_MAX_SIZE = 300

// ── Realtime Throttling ───────────────────────────────────────
export const THROTTLE_BOX_MS    = 60   // ghost box position broadcast
export const THROTTLE_STROKE_MS = 50   // stroke broadcast

// ── Shirt Occupancy ───────────────────────────────────────────
export const OCCUPANCY_WARNING_THRESHOLD = 90   // % — show "almost full" to new scribblers
export const OCCUPANCY_FULL_THRESHOLD    = 100  // % — unlock next shirt

// ── Box Claim ────────────────────────────────────────────────
export const BOX_CLAIM_TTL_MINUTES = 10  // matches DB default + Edge Function cron

// ── Head Images ──────────────────────────────────────────────
export const HEAD_MAX_DIMENSION = 512   // px — resize on upload
export const HEAD_MAX_BYTES     = 5 * 1024 * 1024  // 5 MB

// ── Supabase Storage Buckets ─────────────────────────────────
export const BUCKET_HEADS    = 'avatar-heads'
export const BUCKET_TEXTURES = 'shirt-textures'

// ── Body Styles ──────────────────────────────────────────────
export const BODY_STYLES = [
  { id: 'M1', label: 'Chill Guy',     gender: 'M', svgPath: '/bodies/m1.svg' },
  { id: 'M2', label: 'Sporty Dude',  gender: 'M', svgPath: '/bodies/m2.svg' },
  { id: 'M3', label: 'Sharp Fit',    gender: 'M', svgPath: '/bodies/m3.svg' },
  { id: 'F1', label: 'Cool Girl',    gender: 'F', svgPath: '/bodies/f1.svg' },
  { id: 'F2', label: 'Artsy Vibes',  gender: 'F', svgPath: '/bodies/f2.svg' },
  { id: 'F3', label: 'Boss Energy',  gender: 'F', svgPath: '/bodies/f3.svg' },
] as const

// ── Shirt Colours ─────────────────────────────────────────────
export const SHIRT_COLORS = [
  { id: 'white',  label: 'Classic White', hex: '#F8F8F8' },
  { id: 'cream',  label: 'Vintage Cream', hex: '#F5F0E0' },
  { id: 'black',  label: 'Midnight Black', hex: '#1C1C1C' },
  { id: 'navy',   label: 'Deep Navy',     hex: '#1E3A5F' },
  { id: 'sage',   label: 'Sage Green',    hex: '#6B8E6B' },
] as const

// ── Drawing Tools ─────────────────────────────────────────────
export const TOOL_PEN     = 'pen'
export const TOOL_PENCIL  = 'pencil'   // rougher freehand
export const TOOL_TEXT    = 'text'
export const TOOL_LINE    = 'line'
export const TOOL_CIRCLE  = 'circle'
export const TOOL_RECT    = 'rect'
export const TOOL_ARROW   = 'arrow'
export const TOOL_ERASER  = 'eraser'
export const TOOL_SELECT  = 'select'   // move / resize placed objects

export const CANVAS_COLORS = [
  '#000000', '#FFFFFF', '#E8453C', '#2563EB',
  '#16A34A', '#7C3AED', '#EA580C', '#D97706',
] as const

export const MAX_UNDO_STEPS = 20

// ── Navigation ────────────────────────────────────────────────
export const ROUTES = {
  login:      '/login',
  callback:   '/auth/callback',
  onboarding: '/onboarding',
  dashboard:  '/dashboard',
  profile:    (id: string) => `/profile/${id}`,
  explore:    '/explore',
  groups:     '/groups',
  group:      (id: string) => `/groups/${id}`,
  admin:      '/admin',
} as const

// ── Presence ──────────────────────────────────────────────────
export const ONLINE_THRESHOLD_MS = 15 * 60 * 1000  // 15 minutes
