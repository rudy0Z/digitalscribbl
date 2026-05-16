import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const groupId = typeof body?.group_id === 'string' ? body.group_id : null
  const memberId = typeof body?.user_id === 'string' ? body.user_id : null

  if (!groupId || !memberId) {
    return NextResponse.json({ error: 'group_id and user_id required' }, { status: 400 })
  }

  const db = await createServiceClient()
  const [{ data: group }, { data: actor }] = await Promise.all([
    db.from('friend_groups').select('admin_id').eq('id', groupId).single(),
    db.from('users').select('is_admin').eq('id', auth.user.id).single(),
  ])

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.admin_id === memberId) {
    return NextResponse.json({ error: 'Group maker cannot be removed' }, { status: 400 })
  }
  if (group.admin_id !== auth.user.id && !actor?.is_admin) {
    return NextResponse.json({ error: 'Only the group maker can remove members' }, { status: 403 })
  }

  const { error } = await db
    .from('friend_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId)

  if (error) return NextResponse.json({ error: 'Could not remove member' }, { status: 500 })
  return NextResponse.json({ success: true })
}
