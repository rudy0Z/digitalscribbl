import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import ShareButton from './ShareButton'
import { ROUTES, ONLINE_THRESHOLD_MS } from '@/lib/constants'
import { getPublicSiteUrl } from '@/lib/utils/siteUrl'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { supabase, user } = await requirePageUser()

  // Fetch current user + their shirt + recent scribbles received
  const [{ data: profile }, { data: shirt }] = await Promise.all([
    supabase.from('users')
      .select(`
        id, display_name, body_style, shirt_color, head_front_url, head_back_url,
        batch_id, batches(label, graduation_year, programs(name, academic_groups(name)))
      `)
      .eq('id', user.id)
      .single(),
    supabase.from('shirts')
      .select('id, shirt_number, front_occupancy, back_occupancy, sleeves_occupancy, is_locked')
      .eq('owner_id', user.id)
      .order('shirt_number', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!profile) redirect('/onboarding')

  // Count scribbles received
  const { count: scribbleCount } = await supabase
    .from('scribbles')
    .select('id', { count: 'exact', head: true })
    .eq('shirt_id', shirt?.id ?? '')

  // Recent batchers online
  const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString()
  const { data: onlineBatch } = await supabase
    .from('users')
    .select('id, display_name, body_style, shirt_color, head_front_url')
    .eq('batch_id', profile.batch_id ?? '')
    .neq('id', user.id)
    .gte('last_seen', cutoff)
    .limit(8)

  // Update last_seen
  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

  const batch = profile.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string; academic_groups: { name: string } } } | null

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.explore} className="text-sm text-gray-500 hover:text-ink-900 transition">Explore</Link>
          <Link href={ROUTES.groups}  className="text-sm text-gray-500 hover:text-ink-900 transition">Groups</Link>
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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero: own avatar + shirt CTA */}
        <section className="card p-6 flex gap-6 items-center">
          <Link href={ROUTES.profile(user.id)}>
            <AvatarDisplay
              bodyStyle={profile.body_style}
              shirtColor={profile.shirt_color}
              headFrontUrl={profile.head_front_url}
              scribbleCount={scribbleCount ?? 0}
              size="md"
              className="hover:scale-105 transition-transform"
            />
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-ink-900">{profile.display_name}</h2>
            {batch && (
              <p className="text-sm text-gray-500">
                {batch.programs.name} · {batch.label ?? batch.graduation_year}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {scribbleCount ?? 0} scribbles received
            </p>
            {shirt && (
              <div className="mt-3 flex gap-2 items-center">
                <div className="text-xs text-gray-400">
                  Front {Math.round(shirt.front_occupancy)}% full
                </div>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink-900 rounded-full transition-all"
                    style={{ width: `${Math.min(100, shirt.front_occupancy)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Link href={ROUTES.profile(user.id)} className="btn-primary text-xs px-3 py-1.5">
                View my shirt
              </Link>
              <ShareButton profileUrl={`${getPublicSiteUrl()}${ROUTES.profile(user.id)}`} />
            </div>
          </div>
        </section>

        {/* Online batchmates */}
        {(onlineBatch?.length ?? 0) > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Batchmates online now
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {onlineBatch!.map(u => (
                <Link key={u.id} href={ROUTES.profile(u.id)} className="flex flex-col items-center gap-1 group">
                  <div className="relative">
                    <AvatarDisplay
                      bodyStyle={u.body_style}
                      shirtColor={u.shirt_color}
                      headFrontUrl={u.head_front_url}
                      size="sm"
                      className="group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  </div>
                  <span className="text-[10px] text-gray-500 text-center truncate w-full">
                    {u.display_name.split(' ')[0]}
                  </span>
                </Link>
              ))}
              <Link href={ROUTES.explore} className="flex flex-col items-center justify-center gap-1 w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition text-gray-400 text-xs">
                More →
              </Link>
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Quick actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href={ROUTES.explore} className="card p-4 hover:shadow-md transition flex gap-3 items-center">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="text-sm font-semibold text-ink-900">Explore batch</p>
                <p className="text-xs text-gray-400">Find batchmates to scribble on</p>
              </div>
            </Link>
            <Link href={ROUTES.groups} className="card p-4 hover:shadow-md transition flex gap-3 items-center">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-sm font-semibold text-ink-900">Friend groups</p>
                <p className="text-xs text-gray-400">Create or join a group</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
