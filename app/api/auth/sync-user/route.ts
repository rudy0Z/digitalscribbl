import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/server'
import { getAccountKind, getAllowedEmailDomains } from '@/lib/utils/safetyAccess'

export const runtime = 'nodejs'

export async function POST() {
  const auth = await requireApiUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { supabase, user } = auth
  if (!user.email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const kind = getAccountKind(user.email, getAllowedEmailDomains())
  const isUniversity = kind === 'university'

  const { data: existing } = await supabase
    .from('users')
    .select('id, onboarding_completed, is_university_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name ?? user.email.split('@')[0],
      onboarding_completed: !isUniversity,
      shirt_permission: isUniversity ? 'open' : 'locked',
      is_university_verified: isUniversity,
    })

    if (insertError) return NextResponse.json({ error: 'Could not create account' }, { status: 500 })

    if (isUniversity) {
      await supabase.from('shirts').insert({ owner_id: user.id, shirt_number: 1 })
    }

    return NextResponse.json({
      success: true,
      account_kind: kind,
      next: isUniversity ? '/onboarding' : '/dashboard',
    })
  }

  if (existing.is_university_verified !== isUniversity) {
    await supabase
      .from('users')
      .update({ is_university_verified: isUniversity })
      .eq('id', user.id)
  }

  return NextResponse.json({
    success: true,
    account_kind: kind,
    next: existing.onboarding_completed || !isUniversity ? '/dashboard' : '/onboarding',
  })
}
