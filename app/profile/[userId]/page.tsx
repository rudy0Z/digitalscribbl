import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import ShirtView from '@/components/shirt/ShirtView'
import RequestScribbleButton from './RequestScribbleButton'
import { ROUTES } from '@/lib/constants'
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* ── Left: Avatar + info ── */}
          <aside className="md:w-56 flex-shrink-0">
            <AvatarDisplay
              bodyStyle={target.body_style}
              shirtColor={target.shirt_color}
              headFrontUrl={target.head_front_url}
              headBackUrl={target.head_back_url}
              scribbleCount={scribbleCount ?? 0}
              size="lg"
              className="mx-auto"
            />

            <div className="mt-4 text-center">
              <h1 className="text-xl font-display font-bold text-ink-900">{target.display_name}</h1>
              {batch && (
                <p className="text-sm text-gray-500">
                  {batch.programs.name} · {batch.label ?? batch.graduation_year}
                </p>
              )}
              {target.yearbook_quote && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  &ldquo;{target.yearbook_quote}&rdquo;
                </p>
              )}
            </div>

            {/* Permission CTA */}
            {!isOwner && (
              <div className="mt-4">
                {permissionState === 'request' && (
                  <RequestScribbleButton ownerId={targetId} />
                )}
                {permissionState === 'locked' && (
                  <div className="text-center text-xs text-gray-400 py-2 border border-gray-200 rounded-xl">
                    🔒 Shirt is locked
                  </div>
                )}
              </div>
            )}

            {/* Owner settings */}
            {isOwner && (
              <div className="mt-4 space-y-2">
                <Link href="/settings" className="btn-secondary w-full text-xs text-center block">
                  ⚙️ Settings
                </Link>
              </div>
            )}
          </aside>

          {/* ── Right: Shirt view ── */}
          <div className="flex-1 min-w-0">
            {/* Shirt tabs (if multiple shirts) */}
            {(shirts?.length ?? 0) > 1 && (
              <div className="flex gap-2 mb-4">
                {shirts!.map(s => (
                  <Link
                    key={s.id}
                    href={`?shirt=${s.shirt_number}&panel=${panel}`}
                    className={`panel-tab ${s.shirt_number === shirtNum ? "data-[active=true]" : ""}`}
                    data-active={s.shirt_number === shirtNum}
                  >
                    Shirt {s.shirt_number}
                  </Link>
                ))}
              </div>
            )}

            {/* Panel tabs */}
            <div className="flex gap-2 mb-4">
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
                textureUrl={textureUrl ?? undefined}
              />
            ) : (
              <div className="aspect-[2/3] bg-gray-50 rounded-2xl flex items-center justify-center">
                <p className="text-gray-400 text-sm">No shirt yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
