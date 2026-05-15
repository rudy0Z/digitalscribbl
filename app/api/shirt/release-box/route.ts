import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { shirt_id } = await req.json()
  if (!shirt_id) return NextResponse.json({ error: 'shirt_id required' }, { status: 400 })

  const db = await createServiceClient()
  await db.from('box_claims').delete().eq('shirt_id', shirt_id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
