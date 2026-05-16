import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { normalizeReportReason } from '@/lib/utils/safetyAccess'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const reportedUserId = typeof body?.reported_user_id === 'string' ? body.reported_user_id : null
  const reason = normalizeReportReason(body?.reason)

  if (!reportedUserId || !reason) {
    return NextResponse.json({ error: 'User and reason are required' }, { status: 400 })
  }
  if (reportedUserId === auth.user.id) {
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 })
  }

  const db = await createServiceClient()
  const { error } = await db.from('user_reports').insert({
    reported_user_id: reportedUserId,
    reporter_id: auth.user.id,
    reason,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already reported this user' }, { status: 409 })
    }
    console.error('User report failed:', error)
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
