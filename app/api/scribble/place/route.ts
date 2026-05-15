import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { hasCollision, calculateOccupancy } from '@/lib/utils/collision'
import { sanitizeScribbleSvg } from '@/lib/utils/sanitizeSvg'
import { hasDrawableFabricJson, normalizeScribbleBox } from '@/lib/utils/scribbleContract'
import { SHIRT_W, SHIRT_H, OCCUPANCY_FULL_THRESHOLD } from '@/lib/constants'
import type { Panel } from '@/lib/supabase/types'

export const runtime = 'nodejs'

function panelOccupancyKey(panel: Panel) {
  const map: Record<Panel, string> = {
    front:   'front_occupancy',
    back:    'back_occupancy',
    sleeves: 'sleeves_occupancy',
  }
  return map[panel]
}

// ── Route ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    owner_id,
    shirt_number = 1,
    panel,
    placement_mode = 'box',
    x: rawX,
    y: rawY,
    w: rawW,
    h: rawH,
    canvas_svg,
    canvas_json,
  } = body as {
    owner_id:      string
    shirt_number?: number
    placement_mode?: 'box' | 'direct'
    panel:         Panel
    x: unknown; y: unknown; w: unknown; h: unknown
    canvas_svg:    string
    canvas_json:   unknown
  }

  // Input validation
  if (!owner_id || !panel || !canvas_svg || !canvas_json) {
    return NextResponse.json(
      { error: 'Missing required fields', code: 'INVALID_BOX' },
      { status: 400 }
    )
  }

  // Cannot scribble on your own shirt
  if (user.id === owner_id) {
    return NextResponse.json(
      { error: 'Cannot scribble on your own shirt', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }
  if (!['front', 'back', 'sleeves'].includes(panel)) {
    return NextResponse.json({ error: 'Invalid panel', code: 'INVALID_BOX' }, { status: 400 })
  }

  const normalizedBox = normalizeScribbleBox(
    { x: rawX, y: rawY, w: rawW, h: rawH },
    placement_mode === 'direct'
      ? { maxSize: Math.max(SHIRT_W, SHIRT_H) }
      : undefined,
  )
  if (!normalizedBox.ok) {
    return NextResponse.json(
      { error: normalizedBox.error, code: normalizedBox.code },
      { status: 400 }
    )
  }

  if (!hasDrawableFabricJson(canvas_json)) {
    return NextResponse.json(
      { error: 'Canvas is empty — draw something first', code: 'EMPTY_CANVAS' },
      { status: 400 }
    )
  }

  const { x, y, w, h } = normalizedBox.box
  const sanitizedSvg = sanitizeScribbleSvg(canvas_svg)
  if (!sanitizedSvg.ok) {
    const status = sanitizedSvg.error.includes('too large') ? 413 : 400
    return NextResponse.json({ error: sanitizedSvg.error, code: 'INVALID_SVG' }, { status })
  }

  const db = await createServiceClient()

  // ── Get shirt ─────────────────────────────────────────────
  const { data: shirt } = await db
    .from('shirts')
    .select('id, is_locked')
    .eq('owner_id', owner_id)
    .eq('shirt_number', shirt_number)
    .single()

  if (!shirt) return NextResponse.json({ error: 'Shirt not found', code: 'FORBIDDEN' }, { status: 404 })
  if (shirt.is_locked) return NextResponse.json({ error: 'Shirt is locked', code: 'FORBIDDEN' }, { status: 403 })

  // ── Permission check ──────────────────────────────────────
  const { data: owner } = await db
    .from('users')
    .select('shirt_permission, batch_id')
    .eq('id', owner_id)
    .single()

  if (!owner) return NextResponse.json({ error: 'Owner not found', code: 'FORBIDDEN' }, { status: 404 })

  if (owner.shirt_permission === 'locked') {
    return NextResponse.json({ error: 'Shirt is locked', code: 'FORBIDDEN' }, { status: 403 })
  }

  if (owner.shirt_permission === 'request_only') {
    const { data: requestRecord } = await db
      .from('scribble_requests')
      .select('status')
      .eq('requester_id', user.id)
      .eq('owner_id', owner_id)
      .single()

    if (!requestRecord || requestRecord.status !== 'approved') {
      return NextResponse.json(
        { error: 'Permission required — request first', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  if (owner.shirt_permission === 'batch_only') {
    const { data: scribbler } = await db
      .from('users')
      .select('batch_id')
      .eq('id', user.id)
      .single()

    if (!scribbler || scribbler.batch_id !== owner.batch_id) {
      return NextResponse.json({ error: 'Must be in the same batch', code: 'FORBIDDEN' }, { status: 403 })
    }
  }

  // ── Platform-level checks ─────────────────────────────────
  const { data: settings } = await db
    .from('platform_settings')
    .select('key, value')
    .in('key', ['scribbling_enabled', 'deadline_date'])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))

  const scribblingEnabled = settingsMap['scribbling_enabled']
  if (scribblingEnabled === false || scribblingEnabled === 'false') {
    return NextResponse.json(
      { error: 'Scribbling is currently disabled', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }
  if (settingsMap['deadline_date'] && settingsMap['deadline_date'] !== null) {
    const deadline = new Date(settingsMap['deadline_date'] as string)
    if (new Date() > deadline) {
      return NextResponse.json(
        { error: 'Scribble deadline has passed', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  // ── Server-side collision check ───────────────────────────
  const { data: existingScribbles } = await db
    .from('scribbles')
    .select('x, y, w, h')
    .eq('shirt_id', shirt.id)
    .eq('panel', panel)
    .eq('is_hidden', false)

  const candidate = { x, y, w, h }
  if (placement_mode !== 'direct' && hasCollision(candidate, existingScribbles ?? [])) {
    return NextResponse.json(
      { error: 'Someone just placed a scribble there — try a different spot', code: 'COLLISION' },
      { status: 409 }
    )
  }

  // ── Persist scribble (no server-side compositing needed with SVG) ──
  const { data: newScribble, error: scribbleErr } = await db
    .from('scribbles')
    .insert({
      shirt_id:     shirt.id,
      scribbler_id: user.id,
      panel,
      x, y, w, h,
      canvas_svg: sanitizedSvg.svg,
      canvas_json: canvas_json as Parameters<typeof db.from>[0] extends never ? never : unknown,
    })
    .select('id')
    .single()

  if (scribbleErr || !newScribble) {
    console.error('Scribble insert failed:', scribbleErr)
    return NextResponse.json(
      { error: 'Failed to save scribble', code: 'SAVE_FAILED' },
      { status: 500 }
    )
  }

  // ── Recalculate occupancy ─────────────────────────────────
  const allScribbles = [...(existingScribbles ?? []), { x, y, w, h }]
  const newOccupancy = calculateOccupancy(allScribbles, SHIRT_W, SHIRT_H)

  await db
    .from('shirts')
    .update({ [panelOccupancyKey(panel)]: newOccupancy })
    .eq('id', shirt.id)

  // ── Release box claim ─────────────────────────────────────
  await db.from('box_claims').delete().eq('shirt_id', shirt.id).eq('user_id', user.id)

  // ── Unlock next shirt if panel is full ────────────────────
  if (newOccupancy >= OCCUPANCY_FULL_THRESHOLD) {
    await unlockNextShirt(db, owner_id, shirt_number)
  }

  // ── Notification ─────────────────────────────────────────
  const { data: scribbler } = await db
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  await db.from('notifications').insert({
    user_id:             owner_id,
    type:                'scribble_received',
    title:               `${scribbler?.display_name ?? 'Someone'} scribbled on your shirt`,
    body:                `on the ${panel} panel`,
    related_user_id:     user.id,
    related_shirt_id:    shirt.id,
    related_scribble_id: newScribble.id,
  })

  return NextResponse.json({
    success:     true,
    scribble_id: newScribble.id,
    occupancy:   newOccupancy,
  })
}

// ── Unlock next shirt ────────────────────────────────────────

async function unlockNextShirt(
  db: Awaited<ReturnType<typeof createServiceClient>>,
  ownerId: string,
  currentShirtNum: number
) {
  const next = currentShirtNum + 1

  const { data: existing } = await db
    .from('shirts')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('shirt_number', next)
    .single()

  if (!existing) {
    await db.from('shirts').insert({ owner_id: ownerId, shirt_number: next })

    await db.from('notifications').insert({
      user_id: ownerId,
      type:    'shirt_unlocked',
      title:   `Shirt ${next} unlocked! 🎉`,
      body:    'Your first shirt is full — a new blank one is ready.',
    })
  }
}
