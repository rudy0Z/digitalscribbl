import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { calculateOccupancy } from '@/lib/utils/collision'
import { SHIRT_W, SHIRT_H } from '@/lib/constants'
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

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { scribble_id } = await req.json()
  if (!scribble_id) return NextResponse.json({ error: 'scribble_id required' }, { status: 400 })

  const db = await createServiceClient()

  // Fetch scribble + shirt ownership
  const { data: scribble } = await db
    .from('scribbles')
    .select('id, shirt_id, panel, scribbler_id, shirts!inner(owner_id)')
    .eq('id', scribble_id)
    .single()

  if (!scribble) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const shirtOwner = (scribble.shirts as unknown as { owner_id: string }).owner_id
  const { data: caller } = await db.from('users').select('is_admin').eq('id', user.id).single()

  // Only shirt owner, original scribbler, or admin can remove
  const canRemove =
    user.id === shirtOwner ||
    user.id === scribble.scribbler_id ||
    caller?.is_admin

  if (!canRemove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Soft-delete the scribble
  await db.from('scribbles').update({ is_hidden: true }).eq('id', scribble_id)

  // Recalculate occupancy from remaining visible scribbles on this panel
  const { data: remaining } = await db
    .from('scribbles')
    .select('x, y, w, h')
    .eq('shirt_id', scribble.shirt_id)
    .eq('panel', scribble.panel)
    .eq('is_hidden', false)

  const newOccupancy = calculateOccupancy(remaining ?? [], SHIRT_W, SHIRT_H)

  await db
    .from('shirts')
    .update({ [panelOccupancyKey(scribble.panel as Panel)]: newOccupancy })
    .eq('id', scribble.shirt_id)

  return NextResponse.json({ success: true })
}
