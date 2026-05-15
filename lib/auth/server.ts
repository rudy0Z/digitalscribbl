import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEV_AUTH_COOKIE, getDevAuthSlot, getDevAuthUserId, isDevAuthBypassEnabled } from './dev'

export interface AppAuthUser {
  id: string
  email: string | null
  user_metadata?: Record<string, unknown>
}

interface AuthContext {
  user: AppAuthUser | null
  supabase: Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof createServiceClient>>
  isBypass: boolean
}

async function resolveBypassUser() {
  if (!isDevAuthBypassEnabled()) return null

  const cookieStore = await cookies()
  const selectedSlot = getDevAuthSlot(cookieStore.get(DEV_AUTH_COOKIE)?.value)
  const userId = getDevAuthUserId(process.env, selectedSlot)
  const db = await createServiceClient()
  const { data: profile } = await db
    .from('users')
    .select('id, display_name')
    .eq('id', userId)
    .single()

  if (!profile) return null

  return {
    user: {
      id: profile.id,
      email: null,
      user_metadata: {
        full_name: profile.display_name,
        dev_slot: selectedSlot,
      },
    } satisfies AppAuthUser,
    supabase: db,
    isBypass: true,
  } satisfies AuthContext
}

export async function getServerAuthContext(): Promise<AuthContext> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (user) {
    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        user_metadata: user.user_metadata,
      },
      supabase: authClient,
      isBypass: false,
    }
  }

  return (await resolveBypassUser()) ?? {
    user: null,
    supabase: authClient,
    isBypass: false,
  }
}

export async function requirePageUser() {
  const context = await getServerAuthContext()
  if (!context.user) redirect('/login')
  return context as AuthContext & { user: AppAuthUser }
}

export async function requireApiUser() {
  const context = await getServerAuthContext()
  if (!context.user) return null
  return context as AuthContext & { user: AppAuthUser }
}
