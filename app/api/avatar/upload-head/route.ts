import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/auth/server'
import { HEAD_MAX_BYTES, HEAD_MAX_DIMENSION, BUCKET_HEADS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file  = formData.get('file') as File | null
  const side  = formData.get('side') as 'front' | 'back' | null

  if (!file || !side || !['front', 'back'].includes(side)) {
    return NextResponse.json({ error: 'file and side (front|back) are required' }, { status: 400 })
  }

  // Validate MIME type — never trust client-reported type
  const bytes   = await file.arrayBuffer()
  const buffer  = Buffer.from(bytes)
  const { fileTypeFromBuffer } = await import('file-type')
  const type    = await fileTypeFromBuffer(buffer)

  if (!type || !['image/png', 'image/jpeg'].includes(type.mime)) {
    return NextResponse.json({ error: 'Only PNG and JPEG images are accepted' }, { status: 400 })
  }
  if (buffer.length > HEAD_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 413 })
  }

  // Resize to max 512×512, convert to WebP
  const sharp = (await import('sharp')).default
  const processed = await sharp(buffer)
    .resize(HEAD_MAX_DIMENSION, HEAD_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const db        = await createServiceClient()
  const path      = `heads/${user.id}/${side}.webp`
  const { error } = await db.storage
    .from(BUCKET_HEADS)
    .upload(path, processed, { contentType: 'image/webp', upsert: true })

  if (error) {
    console.error('Head upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET_HEADS).getPublicUrl(path)

  // Append a cache-busting timestamp so CDN/browsers always serve the new image
  // when a user re-uploads their head photo (same storage path, upserted).
  const urlWithVersion = `${publicUrl}?v=${Date.now()}`

  // Update user record with versioned URL
  const field = side === 'front' ? 'head_front_url' : 'head_back_url'
  await db.from('users').update({ [field]: urlWithVersion }).eq('id', user.id)

  return NextResponse.json({ url: urlWithVersion })
}
