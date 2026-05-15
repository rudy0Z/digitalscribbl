import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEV_AUTH_COOKIE, getDevAuthSlot, getDevAuthUserId, isDevAuthBypassEnabled } from '@/lib/auth/dev'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session: keep this directly after createServerClient.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/auth/callback', '/dev']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  const devBypassEnabled = isDevAuthBypassEnabled()
  const selectedSlot = getDevAuthSlot(request.cookies.get(DEV_AUTH_COOKIE)?.value)

  if (!user && !isPublic && !devBypassEnabled) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const effectiveUserId = user?.id ?? (devBypassEnabled ? getDevAuthUserId(process.env, selectedSlot) : '')

  if (effectiveUserId) {
    const skipOnboardingCheck =
      pathname === '/onboarding' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/')

    if (!skipOnboardingCheck) {
      const profileClient = user
        ? supabase
        : createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              cookies: {
                getAll() {
                  return request.cookies.getAll()
                },
                setAll() {},
              },
              auth: { persistSession: false },
            }
          )

      const { data: profile } = await profileClient
        .from('users')
        .select('onboarding_completed')
        .eq('id', effectiveUserId)
        .single()

      if (!profile?.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|bodies|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
