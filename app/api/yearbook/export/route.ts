/**
 * GET /api/yearbook/export?batchId=...
 *
 * Admin-only. Generates a ZIP archive containing a PNG profile card for every
 * onboarded, non-suspended student in the given batch (or all batches when
 * batchId is omitted).
 *
 * Card format is identical to /api/avatar/export:
 *   800 px wide · cream background · circular head · shirt colour panel
 *   with SVG scribbles composited · name / program / quote / scribble count footer
 *
 * ZIP is assembled with fflate (pure JS, no native deps) and streamed back.
 * Max 200 students per request to keep response time reasonable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { SHIRT_W, SHIRT_H } from '@/lib/constants'
import { zipSync } from 'fflate'

export const runtime = 'nodejs'
// Vercel function timeout — give plenty of time for large batches
export const maxDuration = 300  // 5 min (Pro plan); free tier silently caps at 60s

// ── Card dimensions (keep in sync with /api/avatar/export) ────
const CARD_W  = 800
const HEAD_D  = 240
const HEAD_R  = HEAD_D / 2
const PANEL_W = CARD_W
const PANEL_H = Math.round(PANEL_W * (SHIRT_H / SHIRT_W))   // 1200
const CARD_H  = HEAD_R + PANEL_H + 160
const HEAD_CX = CARD_W / 2
const HEAD_CY = HEAD_R + 20

// Scale from shirt canvas → card panel
const SCALE_X = PANEL_W / SHIRT_W  // 2×
const SCALE_Y = PANEL_H / SHIRT_H  // 2×

const MAX_STUDENTS = 200

// ── Helper: escape XML special chars ──────────────────────────
const esc = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// ── Scribble shape used for card generation ───────────────────
type CardScribble = { x: number; y: number; w: number; h: number; canvas_svg: string | null }

// ── Generate a single card PNG ────────────────────────────────
async function generateCard(
  sharp: typeof import('sharp'),
  profile: {
    display_name:   string
    shirt_color:    string | null
    head_front_url: string | null
    yearbook_quote: string | null
  },
  scribbles:    CardScribble[],
  scribbleCount: number,
  batchLabel:   string,
  program:      string,
): Promise<Buffer> {
  const BG = { r: 250, g: 248, b: 244, alpha: 1 }

  let card = await sharp({
    create: { width: CARD_W, height: CARD_H, channels: 4, background: BG },
  }).png().toBuffer()

  const panelTop = HEAD_CY + HEAD_R - 40

  // ── 1. Shirt-coloured panel + SVG scribbles ──────────────────
  const hexColor = profile.shirt_color ?? '#F8F8F8'
  const cr = parseInt(hexColor.slice(1, 3), 16)
  const cg = parseInt(hexColor.slice(3, 5), 16)
  const cb = parseInt(hexColor.slice(5, 7), 16)

  let shirtPanel: Buffer = await sharp({
    create: { width: PANEL_W, height: PANEL_H, channels: 4, background: { r: cr, g: cg, b: cb, alpha: 1 } },
  }).png().toBuffer()

  // Rasterise each SVG scribble at its scaled position
  const svgComposites: import('sharp').OverlayOptions[] = []
  for (const sc of scribbles) {
    if (!sc.canvas_svg) continue
    try {
      const sw = Math.max(1, Math.round(sc.w * SCALE_X))
      const sh = Math.max(1, Math.round(sc.h * SCALE_Y))
      const sx = Math.round(sc.x * SCALE_X)
      const sy = Math.round(sc.y * SCALE_Y)
      const rasterized = await sharp(Buffer.from(sc.canvas_svg))
        .resize(sw, sh, { fit: 'fill' })
        .png()
        .toBuffer()
      svgComposites.push({ input: rasterized, left: sx, top: sy, blend: 'over' })
    } catch { /* skip invalid SVG */ }
  }

  if (svgComposites.length > 0) {
    shirtPanel = await sharp(shirtPanel).composite(svgComposites).png().toBuffer()
  }

  card = await sharp(card)
    .composite([{ input: shirtPanel, left: 0, top: panelTop, blend: 'over' }])
    .png().toBuffer()

  // ── 2. Head photo — circular crop ─────────────────────────────
  if (profile.head_front_url) {
    try {
      const res = await fetch(profile.head_front_url)
      if (res.ok) {
        const headBuf = Buffer.from(await res.arrayBuffer())
        const circleMask = Buffer.from(
          `<svg width="${HEAD_D}" height="${HEAD_D}">` +
          `<circle cx="${HEAD_R}" cy="${HEAD_R}" r="${HEAD_R}"/>` +
          `</svg>`
        )
        const headCircle = await sharp(headBuf)
          .resize(HEAD_D, HEAD_D, { fit: 'cover' })
          .composite([{ input: circleMask, blend: 'dest-in' }])
          .png().toBuffer()

        const ringD = HEAD_D + 8
        const ring  = Buffer.from(
          `<svg width="${ringD}" height="${ringD}">` +
          `<circle cx="${ringD / 2}" cy="${ringD / 2}" r="${ringD / 2}" fill="white"/>` +
          `</svg>`
        )
        card = await sharp(card)
          .composite([
            { input: ring,       left: HEAD_CX - ringD / 2, top: HEAD_CY - ringD / 2, blend: 'over' },
            { input: headCircle, left: HEAD_CX - HEAD_R,    top: HEAD_CY - HEAD_R,    blend: 'over' },
          ])
          .png().toBuffer()
      }
    } catch { /* not critical */ }
  } else {
    const placeholder = Buffer.from(
      `<svg width="${HEAD_D}" height="${HEAD_D}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${HEAD_R}" cy="${HEAD_R}" r="${HEAD_R}" fill="#E5E7EB"/>` +
      `<text x="${HEAD_R}" y="${HEAD_R + 20}" text-anchor="middle" font-size="80">😶</text>` +
      `</svg>`
    )
    card = await sharp(card)
      .composite([{ input: placeholder, left: HEAD_CX - HEAD_R, top: HEAD_CY - HEAD_R, blend: 'over' }])
      .png().toBuffer()
  }

  // ── 3. Text footer ───────────────────────────────────────────
  const footerTop  = panelTop + PANEL_H
  const footerH    = CARD_H - footerTop
  const quote      = profile.yearbook_quote ?? ''
  const shortQuote = quote.length > 80 ? quote.slice(0, 77) + '…' : quote
  const countStr   = `${scribbleCount} scribbles`
  const name       = profile.display_name ?? 'Student'

  const textSvg = Buffer.from(
    `<svg width="${CARD_W}" height="${footerH}" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="${CARD_W / 2}" y="40" text-anchor="middle" font-size="32" font-weight="bold" font-family="Georgia, serif" fill="#1C1C1C">${esc(name)}</text>` +
    (program ? `<text x="${CARD_W / 2}" y="72" text-anchor="middle" font-size="20" font-family="system-ui, sans-serif" fill="#6B7280">${esc(program)}${batchLabel ? ' · ' + esc(batchLabel) : ''}</text>` : '') +
    (shortQuote ? `<text x="${CARD_W / 2}" y="${program ? 108 : 80}" text-anchor="middle" font-size="18" font-style="italic" font-family="Georgia, serif" fill="#4B5563">"${esc(shortQuote)}"</text>` : '') +
    `<text x="${CARD_W / 2}" y="${footerH - 16}" text-anchor="middle" font-size="16" font-family="system-ui, sans-serif" fill="#9CA3AF">${esc(countStr)} · scribbl</text>` +
    `</svg>`
  )

  card = await sharp(card)
    .composite([{ input: textSvg, left: 0, top: footerTop, blend: 'over' }])
    .png({ compressionLevel: 6 })
    .toBuffer()

  return card
}

// ── Route handler ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batchId') ?? ''

  // Admin auth check
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user: viewer } = auth

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', viewer.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = await createServiceClient()

  // Fetch batch info for naming
  const batchInfo = batchId
    ? (await db.from('batches')
        .select('label, graduation_year, programs(name)')
        .eq('id', batchId)
        .single()).data
    : null

  // Fetch users
  let usersQ = db
    .from('users')
    .select(`
      id, display_name, shirt_color, head_front_url, yearbook_quote,
      batches(label, graduation_year, programs(name))
    `)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .order('display_name')
    .limit(MAX_STUDENTS)

  if (batchId) usersQ = usersQ.eq('batch_id', batchId)

  const { data: users, error: usersError } = await usersQ
  if (usersError || !users) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  if (users.length === 0) {
    return NextResponse.json({ error: 'No students found' }, { status: 404 })
  }

  const userIds = users.map(u => u.id)

  // Fetch all shirts for these users (first shirt per user, sorted by shirt_number)
  const { data: shirts } = await db
    .from('shirts')
    .select('id, owner_id')
    .in('owner_id', userIds)
    .order('shirt_number')

  // Build lookup maps
  const shirtOwnerMap: Record<string, string> = {}   // shirt_id → owner_id
  const ownerShirtMap: Record<string, string>  = {}  // owner_id → first shirt_id

  for (const s of shirts ?? []) {
    shirtOwnerMap[s.id] = s.owner_id
    // Only record the first shirt per owner (lowest shirt_number, since ordered asc)
    if (!(s.owner_id in ownerShirtMap)) {
      ownerShirtMap[s.owner_id] = s.id
    }
  }

  const allShirtIds = Object.keys(shirtOwnerMap)

  // Single bulk query: all non-hidden scribbles for these shirts
  // We need: all panels for count, front only for compositing
  const { data: allScribbles } = allShirtIds.length > 0
    ? await db
        .from('scribbles')
        .select('shirt_id, panel, x, y, w, h, canvas_svg')
        .in('shirt_id', allShirtIds)
        .eq('is_hidden', false)
    : { data: [] }

  // Aggregate: count (all panels) + front scribbles (for compositing)
  const countMap:           Record<string, number>         = {}
  const frontScribbleMap:   Record<string, CardScribble[]> = {}

  for (const sc of allScribbles ?? []) {
    const ownerId = shirtOwnerMap[sc.shirt_id]
    if (!ownerId) continue
    // Only count scribbles on the owner's first shirt
    if (ownerShirtMap[ownerId] === sc.shirt_id) {
      countMap[ownerId] = (countMap[ownerId] ?? 0) + 1
      if (sc.panel === 'front') {
        if (!frontScribbleMap[ownerId]) frontScribbleMap[ownerId] = []
        frontScribbleMap[ownerId]!.push({ x: sc.x, y: sc.y, w: sc.w, h: sc.h, canvas_svg: sc.canvas_svg ?? null })
      }
    }
  }

  const sharp = (await import('sharp')).default

  // Generate cards concurrently (batch of 5 to avoid OOM)
  const zipFiles: Record<string, Uint8Array> = {}

  const CONCURRENCY = 5
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const batch = users.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async u => {
      const b = u.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null
      const bLabel  = b
        ? (b.label ?? String(b.graduation_year))
        : (batchInfo
            ? ((batchInfo as unknown as { label: string | null; graduation_year: number }).label
                ?? String((batchInfo as unknown as { graduation_year: number }).graduation_year))
            : '')
      const program = b?.programs?.name ?? ''

      try {
        const cardBuf = await generateCard(
          sharp,
          {
            display_name:   u.display_name,
            shirt_color:    u.shirt_color,
            head_front_url: u.head_front_url,
            yearbook_quote: u.yearbook_quote,
          },
          frontScribbleMap[u.id] ?? [],
          countMap[u.id] ?? 0,
          bLabel,
          program,
        )
        const safeName = (u.display_name ?? 'student')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase()
        zipFiles[`${safeName}_${u.id.slice(0, 6)}.png`] = new Uint8Array(cardBuf)
      } catch (err) {
        console.error(`Card gen failed for ${u.id}:`, err)
        // Skip failed cards — continue with the rest
      }
    }))
  }

  if (Object.keys(zipFiles).length === 0) {
    return NextResponse.json({ error: 'No cards could be generated' }, { status: 500 })
  }

  // Assemble ZIP (level 0 = store, PNGs are already compressed)
  const zipBuf = zipSync(zipFiles, { level: 0 })

  const batchLabelForFile = batchInfo
    ? ((batchInfo as unknown as { label: string | null; graduation_year: number }).label
        ?? String((batchInfo as unknown as { graduation_year: number }).graduation_year))
    : 'all'
  const safeLabel = batchLabelForFile.replace(/[^a-z0-9]/gi, '_').toLowerCase()

  return new NextResponse(zipBuf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="scribbl_yearbook_${safeLabel}.zip"`,
      'Cache-Control':       'no-store',
    },
  })
}
