import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function safeString(value: unknown, fallback: string, maxLength = 300) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return (trimmed || fallback).slice(0, maxLength)
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value).slice(0, 2000)) as Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  const body = await req.json().catch(() => null)

  const route = safeString(body?.route, 'unknown route', 160)
  const message = safeString(body?.message, 'Unknown error')
  const errorCode = typeof body?.error_code === 'string' ? body.error_code.slice(0, 80) : null

  const db = await createServiceClient()
  const { error } = await db.from('error_logs').insert({
    user_id: auth?.user.id ?? null,
    route,
    error_code: errorCode,
    message,
    metadata: safeMetadata(body?.metadata),
    user_agent: req.headers.get('user-agent'),
  })

  if (error) {
    console.error('Error log insert failed:', error)
    return NextResponse.json({ error: 'Could not log error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
