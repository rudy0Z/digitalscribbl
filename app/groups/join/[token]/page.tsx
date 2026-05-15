import { redirect } from 'next/navigation'
import { requirePageUser } from '@/lib/auth/server'
import { ROUTES } from '@/lib/constants'

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Server-side join handler — visiting /groups/join/[token] auto-joins
 * the user then redirects to the group page.
 */
export default async function JoinGroupPage({ params }: Props) {
  const { supabase, user } = await requirePageUser()
  const { token } = await params

  // Look up the group
  const { data: group } = await supabase
    .from('friend_groups')
    .select('id, name')
    .eq('invite_token', token)
    .single()

  if (!group) redirect('/groups?join_error=invalid')

  // Check capacity
  const { count: memberCount } = await supabase
    .from('friend_group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  if ((memberCount ?? 0) >= 50) redirect('/groups?join_error=full')

  // Upsert (safe if already a member)
  await supabase
    .from('friend_group_members')
    .upsert({ group_id: group.id, user_id: user.id }, { ignoreDuplicates: true })

  redirect(ROUTES.group(group.id))
}
