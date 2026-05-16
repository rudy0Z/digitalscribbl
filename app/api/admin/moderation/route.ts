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
  const { supabase, user } = auth

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { scribble_id, action } = await req.json()
  if (!scribble_id || !action) {
    return NextResponse.json({ error: 'scribble_id and action required' }, { status: 400 })
  }

  const db = await createServiceClient()

  if (action === 'dismiss') {
    await db.from('scribbles')
      .update({ is_flagged: false, flag_count: 0, is_hidden: false })
      .eq('id', scribble_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'remove' || action === 'hide') {
    const { data: scribble } = await db
      .from('scribbles')
      .select('shirt_id, panel')
      .eq('id', scribble_id)
      .single()

    await db.from('scribbles').update({ is_hidden: true }).eq('id', scribble_id)

    if (scribble) {
      // Recalculate occupancy from remaining visible scribbles
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
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { report_id, action } = await req.json().catch(() => ({}))
  if (!report_id || !['dismiss', 'suspend'].includes(action)) {
    return NextResponse.json({ error: 'report_id and valid action required' }, { status: 400 })
  }

  const db = await createServiceClient()
  const { data: report } = await db
    .from('user_reports')
    .select('reported_user_id')
    .eq('id', report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  if (action === 'suspend') {
    await db.from('users').update({ is_suspended: true }).eq('id', report.reported_user_id)
  }

  const { error } = await db
    .from('user_reports')
    .update({
      status: action === 'suspend' ? 'actioned' : 'dismissed',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', report_id)

  if (error) return NextResponse.json({ error: 'Could not update report' }, { status: 500 })
  return NextResponse.json({ success: true })
}
