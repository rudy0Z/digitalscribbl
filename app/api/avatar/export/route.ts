/**
 * GET /api/avatar/export?userId=...&panel=front
 *
 * Generates a high-quality PNG "profile card" for download.
 * Composited entirely server-side with Sharp — no CORS issues.
 *
 * With the SVG scribble architecture, there are no pre-composited shirt
 * textures. Instead we render the shirt's base colour as the panel
 * background and rasterise each SVG scribble directly onto the card.
 *
 * Card layout (800 × ~1400 px):
 *   - Cream background
 *   - Circular head photo (240 px) centred at top
 *   - Shirt-coloured panel with SVG scribbles composited on top
 *   - Name + program + quote + scribble count footer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { SHIRT_W, SHIRT_H } from '@/lib/constants'
import { canExportProfileCard } from '@/lib/utils/exportAccess'

export const runtime = 'nodejs'

// Card dimensions
const CARD_W    = 800
const HEAD_D    = 240  // head circle diameter
const HEAD_R    = HEAD_D / 2
const PANEL_W   = CARD_W
const PANEL_H   = Math.round(PANEL_W * (SHIRT_H / SHIRT_W))  // 1200
const CARD_H    = HEAD_R + PANEL_H + 160  // head hangs halfway above panel + footer
const HEAD_CX   = CARD_W / 2
const HEAD_CY   = HEAD_R + 20             // 20px top padding

// Scale from shirt canvas → card panel
const SCALE_X   = PANEL_W / SHIRT_W      // 2×
const SCALE_Y   = PANEL_H / SHIRT_H      // 2×

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId  = searchParams.get('userId')
  const panel   = (searchParams.get('panel') ?? 'front') as 'front' | 'back' | 'sleeves'

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Auth — normal users can export only their own profile card. Admins retain
  // manual export access for the final yearbook extraction workflow.
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await createServiceClient()
  const { data: viewerProfile } = await db
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .single()

  if (!canExportProfileCard({
    viewerId: auth.user.id,
    targetUserId: userId,
    isAdmin: Boolean(viewerProfile?.is_admin),
  })) {
    return NextResponse.json(
      { error: 'You can only export your own profile card. Group and batch exports must be requested manually.' },
      { status: 403 }
    )
  }

  // Fetch target user
  const { data: profile } = await db
    .from('users')
    .select('display_name, body_style, shirt_color, head_front_url, head_back_url, yearbook_quote, batches(label, graduation_year, programs(name))')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch shirt (we only need the id to query scribbles)
  const { data: shirt } = await db
    .from('shirts')
    .select('id')
    .eq('owner_id', userId)
    .order('shirt_number')
    .limit(1)
    .single()

  // Fetch scribbles for the requested panel
  const { data: scribbles } = shirt
    ? await db
        .from('scribbles')
        .select('x, y, w, h, canvas_svg')
        .eq('shirt_id', shirt.id)
        .eq('panel', panel)
        .eq('is_hidden', false)
    : { data: [] }

  // Total scribble count (all panels)
  const { count: scribbleCount } = shirt
    ? await db
        .from('scribbles')
        .select('id', { count: 'exact', head: true })
        .eq('shirt_id', shirt.id)
        .eq('is_hidden', false)
    : { count: 0 }

  const batch      = profile.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null
  const batchLabel = batch ? (batch.label ?? String(batch.graduation_year)) : ''
  const program    = batch?.programs?.name ?? ''

  const sharp = (await import('sharp')).default

  // Escape XML special characters (used in text SVG)
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // ── 1. Base card: cream background ──────────────────────────
  const BG = { r: 250, g: 248, b: 244, alpha: 1 }  // #FAF8F4 cream

  let card: Buffer = await sharp({
    create: { width: CARD_W, height: CARD_H, channels: 4, background: BG },
  }).png().toBuffer()

  const panelTop = HEAD_CY + HEAD_R - 40  // panel starts 40px below head centre

  // ── 2. Shirt-coloured panel + SVG scribbles ───────────────
  const hexColor = profile.shirt_color ?? '#F8F8F8'
  const cr = parseInt(hexColor.slice(1, 3), 16)
  const cg = parseInt(hexColor.slice(3, 5), 16)
  const cb = parseInt(hexColor.slice(5, 7), 16)

  let shirtPanel: Buffer = await sharp({
    create: { width: PANEL_W, height: PANEL_H, channels: 4, background: { r: cr, g: cg, b: cb, alpha: 1 } },
  }).png().toBuffer()

  // Rasterise each SVG scribble at its scaled position on the panel
  const svgComposites: import('sharp').OverlayOptions[] = []
  for (const sc of scribbles ?? []) {
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
    shirtPanel = await sharp(shirtPanel)
      .composite(svgComposites)
      .png()
      .toBuffer()
  }

  card = await sharp(card)
    .composite([{ input: shirtPanel, left: 0, top: panelTop, blend: 'over' }])
    .png()
    .toBuffer()

  // ── 3. Head photo — circular crop ─────────────────────────
  const headUrl = panel === 'back'
    ? (profile.head_back_url ?? profile.head_front_url)
    : profile.head_front_url

  if (headUrl) {
    try {
      const res = await fetch(headUrl)
      if (res.ok) {
        const headBuf = Buffer.from(await res.arrayBuffer())

        // Create circular mask
        const circleMask = Buffer.from(
          `<svg width="${HEAD_D}" height="${HEAD_D}">` +
          `<circle cx="${HEAD_R}" cy="${HEAD_R}" r="${HEAD_R}"/>` +
          `</svg>`
        )
        const headCircle = await sharp(headBuf)
          .resize(HEAD_D, HEAD_D, { fit: 'cover' })
          .composite([{ input: circleMask, blend: 'dest-in' }])
          .png()
          .toBuffer()

        // White ring behind head
        const ringD = HEAD_D + 8
        const ring = Buffer.from(
          `<svg width="${ringD}" height="${ringD}">` +
          `<circle cx="${ringD / 2}" cy="${ringD / 2}" r="${ringD / 2}" fill="white"/>` +
          `</svg>`
        )

        card = await sharp(card)
          .composite([
            { input: ring,       left: HEAD_CX - ringD / 2, top: HEAD_CY - ringD / 2, blend: 'over' },
            { input: headCircle, left: HEAD_CX - HEAD_R,    top: HEAD_CY - HEAD_R,    blend: 'over' },
          ])
          .png()
          .toBuffer()
      }
    } catch { /* head not critical */ }
  } else {
    // Placeholder head: grey circle
    const placeholder = Buffer.from(
      `<svg width="${HEAD_D}" height="${HEAD_D}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${HEAD_R}" cy="${HEAD_R}" r="${HEAD_R}" fill="#E5E7EB"/>` +
      `<text x="${HEAD_R}" y="${HEAD_R + 20}" text-anchor="middle" font-size="80">😶</text>` +
      `</svg>`
    )
    card = await sharp(card)
      .composite([{ input: placeholder, left: HEAD_CX - HEAD_R, top: HEAD_CY - HEAD_R, blend: 'over' }])
      .png()
      .toBuffer()
  }

  // ── 4. Text overlay — name, program, quote, count ─────────
  const footerTop = panelTop + PANEL_H
  const footerH   = CARD_H - footerTop

  const displayName  = profile.display_name ?? 'Student'
  const quote        = profile.yearbook_quote ?? ''
  const countStr     = `${scribbleCount ?? 0} scribbles`
  const shortQuote   = quote.length > 80 ? quote.slice(0, 77) + '…' : quote

  const textSvg = Buffer.from(
    `<svg width="${CARD_W}" height="${footerH}" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="${CARD_W / 2}" y="40" text-anchor="middle" font-size="32" font-weight="bold" font-family="Georgia, serif" fill="#1C1C1C">${esc(displayName)}</text>` +
    (program ? `<text x="${CARD_W / 2}" y="72" text-anchor="middle" font-size="20" font-family="system-ui, sans-serif" fill="#6B7280">${esc(program)}${batchLabel ? ' · ' + esc(batchLabel) : ''}</text>` : '') +
    (shortQuote ? `<text x="${CARD_W / 2}" y="${program ? 108 : 80}" text-anchor="middle" font-size="18" font-style="italic" font-family="Georgia, serif" fill="#4B5563">"${esc(shortQuote)}"</text>` : '') +
    `<text x="${CARD_W / 2}" y="${footerH - 16}" text-anchor="middle" font-size="16" font-family="system-ui, sans-serif" fill="#9CA3AF">${esc(countStr)} · scribbl</text>` +
    `</svg>`
  )

  card = await sharp(card)
    .composite([{ input: textSvg, left: 0, top: footerTop, blend: 'over' }])
    .png({ compressionLevel: 6 })
    .toBuffer()

  const safeName = profile.display_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return new NextResponse(card as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'image/png',
      'Content-Disposition': `attachment; filename="scribbl_${safeName}.png"`,
      'Cache-Control':       'no-store',
    },
  })
}
