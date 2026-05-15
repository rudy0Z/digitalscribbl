import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Validate email domain
  const allowedDomains = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)

  const emailDomain = user.email?.split('@')[1]?.toLowerCase()

  if (allowedDomains.length > 0 && emailDomain && !allowedDomains.includes(emailDomain)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=wrong_domain`)
  }

  // Upsert user row (first sign-in creates the record)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    // First sign-in — create user row
    await supabase.from('users').insert({
      id:           user.id,
      email:        user.email!,
      display_name: user.user_metadata?.full_name ?? user.email!.split('@')[0],
    })

    // Create default Shirt 1
    await supabase.from('shirts').insert({
      owner_id:     user.id,
      shirt_number: 1,
    })

    return NextResponse.redirect(`${origin}/onboarding`)
  }

  if (!existingUser.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // Update last_seen
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.redirect(`${origin}${next}`)
}
