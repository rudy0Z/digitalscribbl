import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAccountKind, getAllowedEmailDomains } from '@/lib/utils/safetyAccess'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code     = searchParams.get('code')
  const rawNext  = searchParams.get('next') ?? '/dashboard'
  // Validate next: must be a relative path that is not an API route
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('/api/') && !rawNext.startsWith('//'))
    ? rawNext
    : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  if (!user.email) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=missing_email`)
  }

  const accountKind = getAccountKind(user.email, getAllowedEmailDomains())
  const isUniversity = accountKind === 'university'
  const db = await createServiceClient()

  // Upsert user row (first sign-in creates the record)
  const { data: existingUser } = await db
    .from('users')
    .select('id, onboarding_completed, is_university_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingUser) {
    const { error: insertError } = await db.from('users').insert({
      id:           user.id,
      email:        user.email,
      display_name: user.user_metadata?.full_name ?? user.email!.split('@')[0],
      onboarding_completed: !isUniversity,
      shirt_permission: isUniversity ? 'open' : 'locked',
      is_university_verified: isUniversity,
    })

    if (insertError) {
      console.error('Google callback user insert failed:', insertError)
      return NextResponse.redirect(`${origin}/login?error=profile_create_failed`)
    }

    if (isUniversity) {
      await db.from('shirts').insert({ owner_id: user.id, shirt_number: 1 })
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  await db
    .from('users')
    .update({
      last_seen: new Date().toISOString(),
      is_university_verified: isUniversity,
    })
    .eq('id', user.id)

  if (isUniversity && !existingUser.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
