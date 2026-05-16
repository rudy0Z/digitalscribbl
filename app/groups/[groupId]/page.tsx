import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import InviteLink from './InviteLink'
import LeaveButton from './LeaveButton'
import RemoveMemberButton from './RemoveMemberButton'
import { ROUTES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function GroupDetailPage({ params }: Props) {
  const { supabase, user } = await requirePageUser()
  const { groupId } = await params

  const { data: group } = await supabase
    .from('friend_groups')
    .select('id, name, admin_id, invite_token, created_at')
    .eq('id', groupId)
    .single()

  if (!group) notFound()

  // Verify viewer is a member
  const { data: membership } = await supabase
    .from('friend_group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) notFound()  // Not a member — treat as not found

  const isAdmin = group.admin_id === user.id

  // Fetch all members with their profiles
  const { data: members } = await supabase
    .from('friend_group_members')
    .select(`
      user_id,
      joined_at,
      users!inner(id, display_name, body_style, shirt_color, head_front_url, last_seen)
    `)
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true })

  const memberList = (members ?? []).map(m => ({
    ...(m.users as unknown as {
      id: string
      display_name: string
      body_style: string
      shirt_color: string
      head_front_url: string | null
      last_seen: string | null
    }),
    joined_at: m.joined_at,
    isAdmin: m.user_id === group.admin_id,
    isMe: m.user_id === user.id,
  }))

  const now = Date.now()
  const ONLINE_MS = 15 * 60 * 1000

  // Current user's profile for the nav
  const { data: myProfile } = await supabase
    .from('users')
    .select('body_style, shirt_color, head_front_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.id} />
          <Link href={ROUTES.profile(user.id)}>
            <AvatarDisplay
              bodyStyle={myProfile?.body_style ?? 'M1'}
              shirtColor={myProfile?.shirt_color ?? '#F8F8F8'}
              headFrontUrl={myProfile?.head_front_url ?? null}
              size="sm"
            />
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link href="/groups" className="text-xs text-gray-400 hover:text-gray-600 transition">← Groups</Link>
            <h1 className="text-2xl font-display font-bold text-ink-900 mt-1">{group.name}</h1>
            <p className="text-xs text-gray-400 mt-1">
              {memberList.length} member{memberList.length !== 1 ? 's' : ''} ·{' '}
              Created {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
          {!isAdmin && <LeaveButton groupId={group.id} />}
        </div>

        {/* Invite link (admin + members can share) */}
        <section className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-ink-900">Invite link</h2>
            <span className="text-xs text-gray-400">— share with friends to add them</span>
          </div>
          <InviteLink token={group.invite_token} />
        </section>

        {/* Member grid */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Members ({memberList.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {memberList.map(m => {
              const isOnline = m.last_seen && now - new Date(m.last_seen).getTime() < ONLINE_MS
              return (
                <div
                  key={m.id}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-white hover:shadow-sm"
                >
                  <Link href={ROUTES.profile(m.id)} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <AvatarDisplay
                        bodyStyle={m.body_style}
                        shirtColor={m.shirt_color}
                        headFrontUrl={m.head_front_url}
                        size="sm"
                        className="transition-transform group-hover:scale-105"
                      />
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                      )}
                      {m.isAdmin && (
                        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 text-[8px] font-bold text-white">
                          A
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="w-full truncate text-xs font-semibold text-ink-900">
                        {m.display_name.split(' ')[0]}
                        {m.isMe && <span className="font-normal text-gray-400"> (you)</span>}
                      </p>
                    </div>
                  </Link>
                  {isAdmin && !m.isAdmin && (
                    <RemoveMemberButton groupId={group.id} userId={m.id} name={m.display_name} />
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Admin controls */}
        {isAdmin && (
          <section className="mt-8 p-4 border border-gray-200 rounded-xl bg-white">
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Admin controls</h2>
            <p className="text-xs text-gray-400">
              Share the invite link above to add members. Hover a member card to remove someone from this friend group.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
