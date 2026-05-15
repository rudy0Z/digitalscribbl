import { redirect } from 'next/navigation'
import { requirePageUser } from '@/lib/auth/server'

export default async function RootPage() {
  const { supabase, user } = await requirePageUser()

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  redirect('/dashboard')
}
