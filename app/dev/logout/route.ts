import { NextResponse } from 'next/server'
import { DEV_AUTH_COOKIE } from '@/lib/auth/dev'

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete(DEV_AUTH_COOKIE)
  return response
}
