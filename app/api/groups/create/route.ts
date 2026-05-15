import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

/** POST /api/groups/create  { name: string } */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { name } = await req.json()
  const trimmed = (name ?? '').trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 60) {
    return NextResponse.json({ error: 'Group name must be 2–60 characters' }, { status: 422 })
  }

  // Cap group creation per user at 5
  const { count } = await supabase
    .from('friend_groups')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', user.id)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'You can only admin up to 5 groups' }, { status: 429 })
  }

  const inviteToken = randomUUID()

  const { data: group, error: gErr } = await supabase
    .from('friend_groups')
    .insert({ name: trimmed, admin_id: user.id, invite_token: inviteToken })
    .select('id, invite_token')
    .single()

  if (gErr || !group) return NextResponse.json({ error: gErr?.message ?? 'Create failed' }, { status: 500 })

  // Add creator as first member
  await supabase
    .from('friend_group_members')
    .insert({ group_id: group.id, user_id: user.id })

  return NextResponse.json({ id: group.id, invite_token: group.invite_token })
}
