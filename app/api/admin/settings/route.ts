import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, value } = await req.json()

  const ALLOWED_KEYS = ['scribbling_enabled', 'deadline_date', 'auto_hide_threshold', 'announcement']
  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid or missing key' }, { status: 400 })
  }

  const db = await createServiceClient()
  // value is already a JS value (boolean, number, string, null) — Supabase handles JSONB serialization
  await db.from('platform_settings').upsert({
    key,
    value,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}
