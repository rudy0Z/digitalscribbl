import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** POST /api/groups/join  { invite_token: string } */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { invite_token } = await req.json()
  if (!invite_token) return NextResponse.json({ error: 'invite_token required' }, { status: 400 })

  // Look up group
  const { data: group } = await supabase
    .from('friend_groups')
    .select('id, name')
    .eq('invite_token', invite_token)
    .single()

  if (!group) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })

  // Check member count cap (50)
  const { count: memberCount } = await supabase
    .from('friend_group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  if ((memberCount ?? 0) >= 50) {
    return NextResponse.json({ error: 'This group is full (max 50 members)' }, { status: 429 })
  }

  // Check already a member
  const { data: existing } = await supabase
    .from('friend_group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ id: group.id, already_member: true })
  }

  const { error } = await supabase
    .from('friend_group_members')
    .insert({ group_id: group.id, user_id: user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: group.id, name: group.name })
}
