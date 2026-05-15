import { NextRequest, NextResponse } from 'next/server'
import { DEV_AUTH_COOKIE, getAvailableDevAuthSlots, getDevAuthSlot, isDevAuthBypassEnabled } from '@/lib/auth/dev'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  if (!isDevAuthBypassEnabled()) {
    return NextResponse.json({ error: 'Dev auth bypass is disabled' }, { status: 404 })
  }

  const { slot } = await params
  const normalizedSlot = getDevAuthSlot(slot)
  const availableSlots = getAvailableDevAuthSlots()

  if (!availableSlots.some((entry) => entry.slot === normalizedSlot)) {
    return NextResponse.json({ error: 'Unknown dev user slot' }, { status: 404 })
  }

  const nextPath = request.nextUrl.searchParams.get('next') || '/dashboard'
  const targetUrl = new URL(nextPath, request.url)
  const response = NextResponse.redirect(targetUrl)

  response.cookies.set(DEV_AUTH_COOKIE, normalizedSlot, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
