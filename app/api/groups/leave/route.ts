import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** POST /api/groups/leave  { group_id: string } */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { group_id } = await req.json()
  if (!group_id) return NextResponse.json({ error: 'group_id required' }, { status: 400 })

  // Admin cannot leave their own group — they must delete it
  const { data: group } = await supabase
    .from('friend_groups')
    .select('admin_id')
    .eq('id', group_id)
    .single()

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  if (group.admin_id === user.id) {
    return NextResponse.json(
      { error: 'Group admins cannot leave — delete the group instead, or transfer admin rights.' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('friend_group_members')
    .delete()
    .eq('group_id', group_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
