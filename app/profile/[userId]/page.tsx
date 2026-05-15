import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import ShirtView from '@/components/shirt/ShirtView'
import { ActivityLog } from '@/components/activity/ActivityLog'
import RequestScribbleButton from './RequestScribbleButton'
import ShareButton from '@/app/dashboard/ShareButton'
import { ROUTES } from '@/lib/constants'
import { getPublicSiteUrl } from '@/lib/utils/siteUrl'
import { buildActivityItems, type ActivityReactionInput, type ActivityScribbleInput, type ActivityUserInput } from '@/lib/utils/activity'
import type { Panel } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ panel?: string; shirt?: string }>
}

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params, searchParams }: Props) {
  const { supabase, user: currentUser } = await requirePageUser()
  const { userId: targetId } = await params
  const resolvedSearchParams = await searchParams

  const panel    = (resolvedSearchParams.panel ?? 'front') as Panel
  const shirtNum = Number(resolvedSearchParams.shirt ?? 1)

  // Fetch target user
  const { data: target } = await supabase
    .from('users')
    .select(`
      id, display_name, body_style, shirt_color,
      head_front_url, head_back_url, shirt_permission,
      yearbook_quote, is_suspended,
      batches(label, graduation_year, programs(name, academic_groups(name)))
    `)
    .eq('id', targetId)
    .single()

  if (!target || target.is_suspended) notFound()

  const isOwner = currentUser.id === targetId

  // Fetch current viewer's own profile (for nav avatar + display name)
  const { data: viewerProfile } = await supabase
    .from('users')
    .select('display_name, body_style, shirt_color, head_front_url')
    .eq('id', currentUser.id)
    .single()

  // Fetch shirts
  const { data: shirts } = await supabase
    .from('shirts')
    .select('id, owner_id, shirt_number, front_texture_url, back_texture_url, sleeves_texture_url, front_occupancy, back_occupancy, sleeves_occupancy, is_locked, created_at')
    .eq('owner_id', targetId)
    .order('shirt_number')

  const activeShirt = shirts?.find(s => s.shirt_number === shirtNum) ?? shirts?.[0]

  // Count scribbles
  const { count: scribbleCount } = await supabase
    .from('scribbles')
    .select('id', { count: 'exact', head: true })
    .eq('shirt_id', activeShirt?.id ?? '')
    .eq('is_hidden', false)

  // Fetch scribbles for this panel — includes canvas_svg so ShirtView can render them
  const { data: scribbles } = await supabase
    .from('scribbles')
    .select('id, x, y, w, h, canvas_svg')
    .eq('shirt_id', activeShirt?.id ?? '')
    .eq('panel', panel)
    .eq('is_hidden', false)

  const { data: recentActivity } = activeShirt
    ? await supabase
        .from('scribbles')
        .select('id, scribbler_id, panel, x, y, w, h, canvas_svg, created_at')
        .eq('shirt_id', activeShirt.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(6)
    : { data: [] }

  const activityScribbles = (recentActivity ?? []) as ActivityScribbleInput[]
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

  // Check permission
  let canScribble = false
  let permissionState: 'can' | 'request' | 'locked' | 'own' = 'locked'

  if (isOwner) {
    permissionState = 'own'
  } else if (!activeShirt?.is_locked && target.shirt_permission !== 'locked') {
    if (target.shirt_permission === 'open') {
      canScribble = true
      permissionState = 'can'
    } else if (target.shirt_permission === 'batch_only') {
      const { data: me }    = await supabase.from('users').select('batch_id').eq('id', currentUser.id).single()
      const { data: owner } = await supabase.from('users').select('batch_id').eq('id', targetId).single()
      if (me?.batch_id === owner?.batch_id) { canScribble = true; permissionState = 'can' }
      else permissionState = 'locked'
    } else if (target.shirt_permission === 'request_only') {
      const { data: req } = await supabase
        .from('scribble_requests')
        .select('status')
        .eq('requester_id', currentUser.id)
        .eq('owner_id', targetId)
        .single()
      if (req?.status === 'approved') { canScribble = true; permissionState = 'can' }
      else permissionState = 'request'
    }
  }

  const textureKey: Record<Panel, string> = {
    front:   'front_texture_url',
    back:    'back_texture_url',
    sleeves: 'sleeves_texture_url',
  }
  const textureUrl = activeShirt ? (activeShirt as Record<string, unknown>)[textureKey[panel]] as string | undefined : undefined

  const batch = target.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string; academic_groups: { name: string } } } | null
  const panelStats = activeShirt
    ? [
        { key: 'front', label: 'Front', value: Math.round(activeShirt.front_occupancy ?? 0) },
        { key: 'back', label: 'Back', value: Math.round(activeShirt.back_occupancy ?? 0) },
        { key: 'sleeves', label: 'Sleeves', value: Math.round(activeShirt.sleeves_occupancy ?? 0) },
      ]
    : []
  const profileUrl = `${getPublicSiteUrl()}${ROUTES.profile(targetId)}`
  const activityItems = buildActivityItems({
    viewerId:    currentUser.id,
    shirtOwner:  { id: target.id, display_name: target.display_name },
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
          <NotificationBell userId={currentUser.id} />
          <Link href={ROUTES.profile(currentUser.id)}>
            <AvatarDisplay
              bodyStyle={viewerProfile?.body_style ?? 'M1'}
              shirtColor={viewerProfile?.shirt_color ?? '#F8F8F8'}
              headFrontUrl={viewerProfile?.head_front_url ?? null}
              size="sm"
            />
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <section className="mb-5 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5 sm:p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Shirt profile
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
                    {target.display_name}
                  </h1>
                  {batch && (
                    <p className="mt-2 text-sm text-gray-500">
                      {batch.programs.name} · {batch.label ?? `${batch.graduation_year} Batch`}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isOwner && <ShareButton profileUrl={profileUrl} />}
                  {isOwner && (
                    <Link href="/settings" className="btn-secondary text-xs">
                      Settings
                    </Link>
                  )}
                  {!isOwner && permissionState === 'request' && (
                    <RequestScribbleButton ownerId={targetId} />
                  )}
                  {!isOwner && permissionState === 'locked' && (
                    <div className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-400">
                      Shirt is locked
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="border-t border-black/10 bg-[#fbf8f0] p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-4">
                <AvatarDisplay
                  bodyStyle={target.body_style}
                  shirtColor={target.shirt_color}
                  headFrontUrl={target.head_front_url}
                  headBackUrl={target.head_back_url}
                  scribbleCount={scribbleCount ?? 0}
                  size="md"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Memory count</p>
                  <p className="mt-1 text-2xl font-bold text-ink-900">{scribbleCount ?? 0}</p>
                  <p className="text-xs text-gray-500">scribbles saved</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {(shirts?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-2">
                {shirts!.map(s => (
                  <Link
                    key={s.id}
                    href={`?shirt=${s.shirt_number}&panel=${panel}`}
                    className="panel-tab"
                    data-active={s.shirt_number === shirtNum}
                  >
                    Shirt {s.shirt_number}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 p-2 shadow-sm">
              <div className="flex gap-1">
                {(['front', 'back', 'sleeves'] as Panel[]).map(p => (
                  <Link
                    key={p}
                    href={`?shirt=${shirtNum}&panel=${p}`}
                    className="panel-tab capitalize"
                    data-active={panel === p}
                  >
                    {p}
                  </Link>
                ))}
              </div>
              <p className="px-2 text-xs text-gray-500">
                Switch surface without leaving the shirt.
              </p>
            </div>

            {activeShirt ? (
              <ShirtView
                shirt={activeShirt}
                ownerId={targetId}
                ownerName={target.display_name}
                panel={panel}
                existingScribbles={scribbles ?? []}
                currentUserId={currentUser.id}
                currentUserName={viewerProfile?.display_name ?? null}
                canScribble={canScribble}
                isOwner={isOwner}
                bodyStyle={target.body_style}
                shirtColor={target.shirt_color}
                headFrontUrl={target.head_front_url}
                headBackUrl={target.head_back_url}
                yearbookQuote={target.yearbook_quote}
                textureUrl={textureUrl ?? undefined}
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[28px] border border-dashed border-gray-200 bg-white">
                <p className="text-sm text-gray-400">No shirt has been created yet.</p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink-900">Shirt map</h2>
              <div className="mt-4 space-y-3">
                {panelStats.map(stat => (
                  <Link key={stat.key} href={`?shirt=${shirtNum}&panel=${stat.key}`} className="block">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-600">{stat.label}</span>
                      <span className="text-gray-400">{stat.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-ink-900 transition-all"
                        style={{ width: `${Math.min(100, stat.value)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink-900">Yearbook card</h2>
              <div className="mt-3 rounded-2xl border border-gray-100 bg-cream-50 p-4">
                <p className="text-sm font-semibold text-ink-900">{target.display_name}</p>
                {batch && <p className="mt-1 text-xs text-gray-500">{batch.programs.name} · {batch.label ?? batch.graduation_year}</p>}
                <p className="mt-4 text-sm italic text-gray-600">
                  {target.yearbook_quote ? `“${target.yearbook_quote}”` : 'No yearbook quote yet.'}
                </p>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                This is the compact card users will understand before final visual polish.
              </p>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink-900">Signing state</h2>
              <p className="mt-2 text-sm text-gray-500">
                {isOwner
                  ? 'You can remove anything from your shirt and share the link for more signatures.'
                  : canScribble
                    ? 'You can sign this shirt now. Open the studio, zoom into the fabric, draw, and save your mark.'
                  : 'You can view this shirt, but signing is currently restricted.'}
              </p>
            </section>

            <ActivityLog
              className="card p-5"
              items={activityItems}
              viewerId={currentUser.id}
              title="Recent marks"
              eyebrow="Sign-back loop"
              emptyText="No one has signed this shirt yet."
            />
          </aside>
        </div>
      </main>
    </div>
  )
}
