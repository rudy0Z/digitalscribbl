import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, action } = await req.json()
  if (!user_id || !action) {
    return NextResponse.json({ error: 'user_id and action required' }, { status: 400 })
  }

  // Prevent self-modification
  if (user_id === user.id) {
    return NextResponse.json({ error: 'Cannot modify your own admin/suspension status' }, { status: 400 })
  }

  const db = await createServiceClient()

  switch (action) {
    case 'suspend':
      await db.from('users').update({ is_suspended: true }).eq('id', user_id)
      break
    case 'unsuspend':
      await db.from('users').update({ is_suspended: false }).eq('id', user_id)
      break
    case 'make_admin':
      await db.from('users').update({ is_admin: true }).eq('id', user_id)
      break
    case 'remove_admin':
      await db.from('users').update({ is_admin: false }).eq('id', user_id)
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
