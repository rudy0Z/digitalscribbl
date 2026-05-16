import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getExportRequestType, normalizeExportRequestNote } from '@/lib/utils/exportAccess'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const requestType = getExportRequestType(body?.request_type)
  const note = normalizeExportRequestNote(body?.note)
  const batchId = typeof body?.batch_id === 'string' ? body.batch_id : null
  const groupId = typeof body?.group_id === 'string' ? body.group_id : null

  if (!requestType) {
    return NextResponse.json({ error: 'Request type must be batch or group' }, { status: 400 })
  }

  if (requestType === 'batch' && !batchId) {
    return NextResponse.json({ error: 'Choose a batch for this export request' }, { status: 400 })
  }

  if (requestType === 'group' && !groupId) {
    return NextResponse.json({ error: 'Choose a friend group for this export request' }, { status: 400 })
  }

  const db = await createServiceClient()

  if (requestType === 'group') {
    const { data: membership } = await db
      .from('friend_group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'You can only request exports for your own groups' }, { status: 403 })
    }
  } else {
    const { data: profile } = await db
      .from('users')
      .select('batch_id')
      .eq('id', auth.user.id)
      .single()

    if (profile?.batch_id !== batchId) {
      return NextResponse.json({ error: 'You can only request your own batch export' }, { status: 403 })
    }
  }

  const { data: existing } = await db
    .from('export_requests')
    .select('id, status')
    .eq('requester_id', auth.user.id)
    .eq('request_type', requestType)
    .eq(requestType === 'batch' ? 'batch_id' : 'group_id', requestType === 'batch' ? batchId : groupId)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, request_id: existing.id, status: existing.status, duplicate: true })
  }

  const { data: requestRow, error } = await db
    .from('export_requests')
    .insert({
      requester_id: auth.user.id,
      request_type: requestType,
      batch_id: requestType === 'batch' ? batchId : null,
      group_id: requestType === 'group' ? groupId : null,
      note,
    })
    .select('id, status')
    .single()

  if (error || !requestRow) {
    console.error('Export request insert failed:', error)
    return NextResponse.json({ error: 'Could not save export request' }, { status: 500 })
  }

  return NextResponse.json({ success: true, request_id: requestRow.id, status: requestRow.status })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { supabase, user } = auth
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const requestId = typeof body?.request_id === 'string' ? body.request_id : null
  const status = typeof body?.status === 'string' ? body.status : null
  const adminNote = normalizeExportRequestNote(body?.admin_note)

  if (!requestId || !['pending', 'approved', 'rejected', 'fulfilled'].includes(status ?? '')) {
    return NextResponse.json({ error: 'request_id and valid status required' }, { status: 400 })
  }

  const update = {
    status,
    admin_note: adminNote,
    updated_at: new Date().toISOString(),
    resolved_at: status === 'pending' ? null : new Date().toISOString(),
    resolved_by: status === 'pending' ? null : user.id,
  }

  const { error } = await supabase.from('export_requests').update(update).eq('id', requestId)
  if (error) return NextResponse.json({ error: 'Could not update request' }, { status: 500 })

  return NextResponse.json({ success: true })
}
