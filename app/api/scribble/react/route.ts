import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getReactionEmoji } from '@/lib/utils/reactions'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const scribbleId = typeof body?.scribble_id === 'string' ? body.scribble_id : null
  const emoji = getReactionEmoji(body?.emoji)

  if (!scribbleId || !emoji) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
  }

  const { user } = auth
  const db = await createServiceClient()

  const { data: scribble, error: scribbleError } = await db
    .from('scribbles')
    .select('id, shirt_id, scribbler_id, is_hidden, shirts!inner(owner_id)')
    .eq('id', scribbleId)
    .single()

  if (scribbleError || !scribble || scribble.is_hidden) {
    return NextResponse.json({ error: 'Scribble not found' }, { status: 404 })
  }

  const { data: existing, error: existingError } = await db
    .from('scribble_reactions')
    .select('id')
    .eq('scribble_id', scribbleId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existingError) {
    console.error('Reaction lookup failed:', existingError)
    return NextResponse.json({ error: 'Reaction failed' }, { status: 500 })
  }

  if (existing) {
    const { error: deleteError } = await db
      .from('scribble_reactions')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Reaction delete failed:', deleteError)
      return NextResponse.json({ error: 'Reaction failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, reacted: false })
  }

  const { error: insertError } = await db
    .from('scribble_reactions')
    .insert({ scribble_id: scribbleId, user_id: user.id, emoji })

  if (insertError) {
    console.error('Reaction insert failed:', insertError)
    return NextResponse.json({ error: 'Reaction failed' }, { status: 500 })
  }

  if (user.id !== scribble.scribbler_id) {
    const { data: reactor } = await db
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    await db.from('notifications').insert({
      user_id:             scribble.scribbler_id,
      type:                'scribble_reaction',
      title:               `${reactor?.display_name ?? 'Someone'} reacted ${emoji} to your scribble`,
      body:                'Tap into the activity feed to sign back or react.',
      related_user_id:     user.id,
      related_shirt_id:    scribble.shirt_id,
      related_scribble_id: scribble.id,
    })
  }

  return NextResponse.json({ success: true, reacted: true })
}
