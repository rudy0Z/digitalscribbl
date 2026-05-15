import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import { CreateGroupForm, JoinGroupForm } from './CreateGroupForm'
import { ROUTES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const { supabase, user } = await requirePageUser()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, body_style, shirt_color, head_front_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Groups the user belongs to, with member count and group info
  const { data: memberships } = await supabase
    .from('friend_group_members')
    .select(`
      group_id,
      joined_at,
      friend_groups!inner(id, name, admin_id, invite_token, created_at)
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  // Get member counts per group
  const groupIds = (memberships ?? []).map(m => m.group_id)
  const { data: memberCounts } = groupIds.length
    ? await supabase
        .from('friend_group_members')
        .select('group_id')
        .in('group_id', groupIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  const groups = (memberships ?? []).map(m => ({
    ...m.friend_groups as unknown as { id: string; name: string; admin_id: string; invite_token: string; created_at: string },
    memberCount: countMap[m.group_id] ?? 1,
    isAdmin: (m.friend_groups as unknown as { admin_id: string }).admin_id === user.id,
  }))

  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.explore} className="text-sm text-gray-500 hover:text-ink-900 transition">Explore</Link>
          <NotificationBell userId={user.id} />
          <Link href={ROUTES.profile(user.id)}>
            <AvatarDisplay
              bodyStyle={profile.body_style}
              shirtColor={profile.shirt_color}
              headFrontUrl={profile.head_front_url}
              size="sm"
            />
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-ink-900">Friend groups</h1>
          <div className="flex gap-2">
            <JoinGroupForm />
            <CreateGroupForm />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-5xl mb-4">👥</p>
            <h2 className="text-lg font-semibold text-ink-900 mb-2">No groups yet</h2>
            <p className="text-sm text-gray-400 mb-6">
              Create a group with your closest friends, or join one with an invite link.
            </p>
            <div className="flex gap-3 justify-center">
              <JoinGroupForm />
              <CreateGroupForm />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <Link
                key={g.id}
                href={ROUTES.group(g.id)}
                className="card p-5 flex items-center gap-4 hover:shadow-md transition group"
              >
                {/* Group icon */}
                <div className="w-12 h-12 rounded-full bg-ink-900 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900 truncate">{g.name}</h3>
                    {g.isAdmin && (
                      <span className="text-[10px] bg-ink-900 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                        admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 transition text-xl">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
