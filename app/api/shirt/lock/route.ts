import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** POST /api/shirt/lock  { shirt_id, locked: boolean } */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { shirt_id, locked } = await req.json()
  if (!shirt_id || typeof locked !== 'boolean') {
    return NextResponse.json({ error: 'shirt_id and locked (boolean) are required' }, { status: 400 })
  }

  // Confirm ownership
  const { data: shirt } = await supabase
    .from('shirts')
    .select('id, owner_id')
    .eq('id', shirt_id)
    .single()

  if (!shirt || shirt.owner_id !== user.id) {
    return NextResponse.json({ error: 'Shirt not found or not yours' }, { status: 404 })
  }

  const { error } = await supabase
    .from('shirts')
    .update({ is_locked: locked })
    .eq('id', shirt_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, locked })
}
