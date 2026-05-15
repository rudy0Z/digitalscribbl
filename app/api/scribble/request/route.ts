import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { owner_id } = await req.json()
  if (!owner_id) return NextResponse.json({ error: 'owner_id required' }, { status: 400 })
  if (owner_id === user.id) return NextResponse.json({ error: 'Cannot request own shirt' }, { status: 400 })

  // Upsert so duplicate clicks don't error
  const { error } = await supabase
    .from('scribble_requests')
    .upsert({ requester_id: user.id, owner_id, status: 'pending' }, { onConflict: 'requester_id,owner_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owner. Notifications are service-role-only by RLS.
  const { data: requester } = await supabase.from('users').select('display_name').eq('id', user.id).single()
  const db = await createServiceClient()
  const { error: notificationError } = await db.from('notifications').insert({
    user_id:         owner_id,
    type:            'request_received',
    title:           `${requester?.display_name ?? 'Someone'} wants to scribble on your shirt`,
    body:            'Approve or ignore from your notification panel',
    related_user_id: user.id,
  })

  if (notificationError) {
    return NextResponse.json({ error: 'Request saved, but notification delivery failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const body = await req.json()
  const action: string = body.action
  if (!['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'action must be approved or rejected' }, { status: 400 })
  }

  // Accept either request_id or requester_id (notification bell uses requester_id)
  let request: { requester_id: string; owner_id: string } | null = null

  if (body.request_id) {
    const { data } = await supabase
      .from('scribble_requests')
      .select('requester_id, owner_id')
      .eq('id', body.request_id)
      .eq('owner_id', user.id)
      .single()
    request = data
  } else if (body.requester_id) {
    const { data } = await supabase
      .from('scribble_requests')
      .select('requester_id, owner_id')
      .eq('requester_id', body.requester_id)
      .eq('owner_id', user.id)
      .single()
    request = data
  }

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error: updateError } = await supabase
    .from('scribble_requests')
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq('requester_id', request.requester_id)
    .eq('owner_id', user.id)

  if (updateError) return NextResponse.json({ error: 'Could not update request' }, { status: 500 })

  const { data: owner } = await supabase.from('users').select('display_name').eq('id', user.id).single()

  const db = await createServiceClient()
  const { error: notificationError } = await db.from('notifications').insert({
    user_id:         request.requester_id,
    type:            action === 'approved' ? 'request_approved' : 'request_rejected',
    title:           action === 'approved'
      ? `${owner?.display_name} approved your scribble request!`
      : 'Your scribble request was not approved',
    related_user_id: user.id,
  })

  if (notificationError) {
    return NextResponse.json({ error: 'Request updated, but notification delivery failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
