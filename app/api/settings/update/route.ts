import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'

export const runtime = 'nodejs'

const ALLOWED_FIELDS = [
  'display_name',
  'yearbook_quote',
  'shirt_permission',
  'body_style',
  'shirt_color',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

const VALID_PERMISSIONS = ['open', 'batch_only', 'request_only', 'locked']
const VALID_BODY_STYLES  = ['M1', 'M2', 'M3', 'F1', 'F2', 'F3']
const VALID_SHIRT_COLORS = ['#F8F8F8', '#F5F0E0', '#1C1C1C', '#1E3A5F', '#6B8E6B']

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  for (const field of ALLOWED_FIELDS) {
    if (!(field in body)) continue
    const val = body[field]

    // Per-field validation
    if (field === 'display_name') {
      if (typeof val !== 'string' || val.trim().length < 2 || val.trim().length > 80) {
        return NextResponse.json({ error: 'display_name must be 2–80 characters' }, { status: 422 })
      }
      updates[field] = val.trim()
    } else if (field === 'yearbook_quote') {
      if (val !== null && (typeof val !== 'string' || val.length > 300)) {
        return NextResponse.json({ error: 'Quote must be under 300 characters' }, { status: 422 })
      }
      updates[field] = val === '' ? null : val
    } else if (field === 'shirt_permission') {
      if (!VALID_PERMISSIONS.includes(val as string)) {
        return NextResponse.json({ error: 'Invalid shirt_permission' }, { status: 422 })
      }
      updates[field] = val
    } else if (field === 'body_style') {
      if (!VALID_BODY_STYLES.includes(val as string)) {
        return NextResponse.json({ error: 'Invalid body_style' }, { status: 422 })
      }
      updates[field] = val
    } else if (field === 'shirt_color') {
      if (!VALID_SHIRT_COLORS.includes(val as string)) {
        return NextResponse.json({ error: 'Invalid shirt_color' }, { status: 422 })
      }
      updates[field] = val
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
