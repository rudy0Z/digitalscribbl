import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { scribble_id } = await req.json()
  if (!scribble_id) return NextResponse.json({ error: 'scribble_id required' }, { status: 400 })

  const { error } = await supabase.from('scribble_reports').insert({
    scribble_id,
    reporter_id: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already reported' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Report failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
