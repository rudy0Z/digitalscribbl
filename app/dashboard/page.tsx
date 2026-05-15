import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, Search, Shirt, Users } from 'lucide-react'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import { ActivityLog } from '@/components/activity/ActivityLog'
import ShareButton from './ShareButton'
import { ROUTES, ONLINE_THRESHOLD_MS } from '@/lib/constants'
import { getPublicSiteUrl } from '@/lib/utils/siteUrl'
import { buildActivityItems, type ActivityReactionInput, type ActivityScribbleInput, type ActivityUserInput } from '@/lib/utils/activity'

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

  const { data: signingQueue } = await supabase
    .from('users')
    .select(`
      id, display_name, body_style, shirt_color, head_front_url, last_seen,
      batches(label, graduation_year, programs(name))
    `)
    .eq('batch_id', profile.batch_id ?? '')
    .neq('id', user.id)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .order('last_seen', { ascending: false, nullsFirst: false })
    .limit(8)

  const queueIds = (signingQueue ?? []).map(u => u.id)
  const { data: queueScribbles } = queueIds.length
    ? await supabase.from('scribbles')
        .select('shirt_id, shirts!inner(owner_id)')
        .in('shirts.owner_id', queueIds)
        .eq('is_hidden', false)
    : { data: [] }

  const queueCountMap: Record<string, number> = {}
  for (const s of queueScribbles ?? []) {
    const oid = (s.shirts as unknown as { owner_id: string }).owner_id
    queueCountMap[oid] = (queueCountMap[oid] ?? 0) + 1
  }

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['scribble_deadline', 'extraction_deadline', 'launch_deadline'])

  const { data: recentOnMyShirt } = shirt
    ? await supabase
        .from('scribbles')
        .select('id, scribbler_id, panel, x, y, w, h, canvas_svg, created_at')
        .eq('shirt_id', shirt.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(6)
    : { data: [] }

  const activityScribbles = (recentOnMyShirt ?? []) as ActivityScribbleInput[]
  const activityScribblerIds = Array.from(new Set(activityScribbles.map(item => item.scribbler_id)))
  const activityScribbleIds = activityScribbles.map(item => item.id)

  const { data: activityUsers } = activityScribblerIds.length
    ? await supabase
        .from('users')
        .select('id, display_name')
        .in('id', activityScribblerIds)
    : { data: [] }

  const { data: activityReactions } = activityScribbleIds.length
    ? await supabase
        .from('scribble_reactions')
        .select('scribble_id, user_id, emoji')
        .in('scribble_id', activityScribbleIds)
    : { data: [] }

  const deadlineValue = settings?.find(s => ['scribble_deadline', 'extraction_deadline', 'launch_deadline'].includes(s.key))?.value
  const deadlineIso = typeof deadlineValue === 'string'
    ? deadlineValue
    : deadlineValue && typeof deadlineValue === 'object' && 'date' in deadlineValue
      ? String((deadlineValue as { date?: unknown }).date)
      : null
  const deadlineDate = deadlineIso ? new Date(deadlineIso) : null
  const daysLeft = deadlineDate && !Number.isNaN(deadlineDate.getTime())
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Update last_seen
  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

  const batch = profile.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string; academic_groups: { name: string } } } | null
  const activityItems = buildActivityItems({
    viewerId:    user.id,
    shirtOwner:  { id: profile.id, display_name: profile.display_name },
    scribbles:   activityScribbles,
    users:       (activityUsers ?? []) as ActivityUserInput[],
    reactions:   (activityReactions ?? []) as ActivityReactionInput[],
  })

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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
              <Link href={ROUTES.profile(user.id)} className="flex items-center justify-center bg-[#f8f5ee] p-6">
                <AvatarDisplay
                  bodyStyle={profile.body_style}
                  shirtColor={profile.shirt_color}
                  headFrontUrl={profile.head_front_url}
                  scribbleCount={scribbleCount ?? 0}
                  size="lg"
                  className="transition-transform hover:scale-[1.02]"
                />
              </Link>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Scribble day lobby</p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
                  Keep your shirt moving.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                  Your job here is simple: collect signatures, sign friends&apos; shirts, and keep the farewell board alive until extraction day.
                </p>

                {batch && (
                  <p className="mt-4 text-sm text-gray-500">
                    {profile.display_name} · {batch.programs.name} · {batch.label ?? `${batch.graduation_year} Batch`}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-100 bg-cream-50 p-4">
                    <p className="text-2xl font-bold text-ink-900">{scribbleCount ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-500">received</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-cream-50 p-4">
                    <p className="text-2xl font-bold text-ink-900">{onlineBatch?.length ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-500">online now</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-cream-50 p-4">
                    <p className="text-2xl font-bold text-ink-900">{shirt ? Math.round((shirt.front_occupancy + shirt.back_occupancy + shirt.sleeves_occupancy) / 3) : 0}%</p>
                    <p className="mt-1 text-xs text-gray-500">avg. filled</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={ROUTES.profile(user.id)} className="btn-primary text-xs">
                    View my shirt
                  </Link>
                  <ShareButton profileUrl={`${getPublicSiteUrl()}${ROUTES.profile(user.id)}`} />
                </div>
              </div>
            </div>
          </div>

          <aside className="card p-5">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} />
              <h2 className="font-display text-lg font-bold text-ink-900">Launch checklist</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Profile photos</span>
                <span className={profile.head_front_url ? 'text-green-600' : 'text-amber-600'}>{profile.head_front_url ? 'Ready' : 'Missing'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Your shirt</span>
                <span className={shirt ? 'text-green-600' : 'text-amber-600'}>{shirt ? 'Live' : 'Missing'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Signatures</span>
                <span className={(scribbleCount ?? 0) > 0 ? 'text-green-600' : 'text-amber-600'}>{(scribbleCount ?? 0) > 0 ? 'Started' : 'Empty'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Extraction</span>
                <span className={daysLeft === null ? 'text-gray-400' : daysLeft <= 3 ? 'text-red-600' : 'text-ink-900'}>
                  {daysLeft === null ? 'No date' : `${daysLeft}d left`}
                </span>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {(onlineBatch?.length ?? 0) > 0 && (
              <section className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink-900">Live right now</h2>
                    <p className="text-xs text-gray-500">People likely to notice your scribble immediately.</p>
                  </div>
                  <Users size={18} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                  {onlineBatch!.map(u => (
                    <Link key={u.id} href={ROUTES.profile(u.id)} className="group flex flex-col items-center gap-1">
                      <div className="relative">
                        <AvatarDisplay
                          bodyStyle={u.body_style}
                          shirtColor={u.shirt_color}
                          headFrontUrl={u.head_front_url}
                          size="sm"
                          className="transition-transform group-hover:scale-105"
                        />
                        <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-gray-500">
                        {u.display_name.split(' ')[0]}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">Shirts to sign next</h2>
                  <p className="text-xs text-gray-500">A practical queue for testing the full friend journey.</p>
                </div>
                <Shirt size={18} className="text-gray-400" />
              </div>

              {(signingQueue?.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                  No batchmates found yet.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {signingQueue!.map(u => {
                    const isOnline = u.last_seen && new Date(u.last_seen) > new Date(cutoff)
                    const uBatch = u.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null

                    return (
                      <Link key={u.id} href={ROUTES.profile(u.id)} className="group flex gap-3 rounded-2xl border border-gray-100 bg-cream-50 p-3 transition hover:border-gray-200 hover:bg-white">
                        <div className="relative flex-shrink-0">
                          <AvatarDisplay
                            bodyStyle={u.body_style}
                            shirtColor={u.shirt_color}
                            headFrontUrl={u.head_front_url}
                            scribbleCount={queueCountMap[u.id] ?? 0}
                            size="sm"
                          />
                          {isOnline && <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-green-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">{u.display_name}</p>
                          {uBatch && <p className="mt-1 truncate text-xs text-gray-500">{uBatch.programs.name} · {uBatch.label ?? uBatch.graduation_year}</p>}
                          <p className="mt-2 text-xs text-gray-400">{queueCountMap[u.id] ?? 0} scribbles received</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <ActivityLog
              className="card p-5"
              items={activityItems}
              viewerId={user.id}
              title="On your shirt"
              eyebrow="React and return"
              emptyText="Your shirt has no marks yet. Share it or start signing friends first."
            />

            <Link href={ROUTES.explore} className="card flex items-start gap-3 p-5 transition hover:border-gray-200 hover:bg-white">
              <Search size={18} className="mt-0.5 text-gray-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">Explore batch</h2>
                <p className="mt-1 text-sm text-gray-500">Search by name and jump straight into a shirt.</p>
              </div>
            </Link>
            <Link href={ROUTES.groups} className="card flex items-start gap-3 p-5 transition hover:border-gray-200 hover:bg-white">
              <Users size={18} className="mt-0.5 text-gray-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">Friend groups</h2>
                <p className="mt-1 text-sm text-gray-500">Use groups as private testing clusters before launch.</p>
              </div>
            </Link>
          </aside>
        </section>
      </main>
    </div>
  )
}
