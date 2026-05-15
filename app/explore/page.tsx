import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import { ROUTES, ONLINE_THRESHOLD_MS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: {
    q?:     string
    group?: string
    prog?:  string
    batch?: string
    page?:  string
  }
}

const PAGE_SIZE = 24

export default async function ExplorePage({ searchParams }: Props) {
  const { supabase, user } = await requirePageUser()

  const page  = Math.max(0, Number(searchParams.page ?? 0))
  const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString()

  // Build query
  let query = supabase
    .from('users')
    .select(`
      id, display_name, body_style, shirt_color, head_front_url, last_seen,
      batches(label, graduation_year, programs(name, academic_groups(name))),
      shirts(id)
    `)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .neq('id', user.id)
    .order('display_name')
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (searchParams.q) {
    query = query.ilike('display_name', `%${searchParams.q}%`)
  }
  if (searchParams.batch) {
    query = query.eq('batch_id', searchParams.batch)
  } else if (searchParams.prog) {
    query = query.eq('program_id', searchParams.prog)
  } else if (searchParams.group) {
    query = query.eq('academic_group_id', searchParams.group)
  }

  const { data: users } = await query

  // Fetch current user profile for nav avatar
  const { data: viewerProfile } = await supabase
    .from('users')
    .select('body_style, shirt_color, head_front_url')
    .eq('id', user.id)
    .single()

  // Fetch filter options
  const [{ data: groups }, { data: programs }, { data: batches }] = await Promise.all([
    supabase.from('academic_groups').select('id, name').order('name'),
    searchParams.group
      ? supabase.from('programs').select('id, name').eq('academic_group_id', searchParams.group).order('name')
      : Promise.resolve({ data: [] }),
    searchParams.prog
      ? supabase.from('batches').select('id, label, graduation_year').eq('program_id', searchParams.prog).order('graduation_year', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // Scribble counts per user
  const userIds = (users ?? []).map(u => u.id)
  const { data: scribblesData } = userIds.length
    ? await supabase.from('scribbles')
        .select('shirt_id, shirts!inner(owner_id)')
        .in('shirts.owner_id', userIds)
        .eq('is_hidden', false)
    : { data: [] }

  const scribbleCountMap: Record<string, number> = {}
  for (const s of scribblesData ?? []) {
    const oid = (s.shirts as unknown as { owner_id: string }).owner_id
    scribbleCountMap[oid] = (scribbleCountMap[oid] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.id} />
          <Link href={ROUTES.profile(user.id)}>
            <AvatarDisplay
              bodyStyle={viewerProfile?.body_style ?? 'M1'}
              shirtColor={viewerProfile?.shirt_color ?? '#F8F8F8'}
              headFrontUrl={viewerProfile?.head_front_url ?? null}
              size="sm"
            />
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-ink-900 mb-6">Explore</h1>

        {/* Filters */}
        <form className="flex flex-wrap gap-3 mb-8">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search by name…"
            className="input flex-1 min-w-[200px] max-w-xs"
          />
          <select name="group" defaultValue={searchParams.group} className="input w-auto">
            <option value="">All groups</option>
            {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {programs && programs.length > 0 && (
            <select name="prog" defaultValue={searchParams.prog} className="input w-auto">
              <option value="">All programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {batches && batches.length > 0 && (
            <select name="batch" defaultValue={searchParams.batch} className="input w-auto">
              <option value="">All batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.label ?? b.graduation_year}</option>)}
            </select>
          )}
          <button type="submit" className="btn-primary">Search</button>
        </form>

        {/* Avatar grid */}
        {(users?.length ?? 0) === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">No one found matching those filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {users!.map(u => {
              const isOnline = u.last_seen && new Date(u.last_seen) > new Date(cutoff)
              const batch    = u.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null

              return (
                <Link
                  key={u.id}
                  href={ROUTES.profile(u.id)}
                  className="group flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition"
                >
                  <div className="relative">
                    <AvatarDisplay
                      bodyStyle={u.body_style}
                      shirtColor={u.shirt_color}
                      headFrontUrl={u.head_front_url}
                      scribbleCount={scribbleCountMap[u.id] ?? 0}
                      size="sm"
                      className="group-hover:scale-105 transition-transform"
                    />
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-ink-900 truncate w-full">{u.display_name.split(' ')[0]}</p>
                    {batch && (
                      <p className="text-[10px] text-gray-400 truncate">{batch.label ?? batch.graduation_year}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center gap-3 mt-8">
          {page > 0 && (
            <Link
              href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
              className="btn-secondary"
            >
              ← Prev
            </Link>
          )}
          {(users?.length ?? 0) === PAGE_SIZE && (
            <Link
              href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
              className="btn-secondary"
            >
              Next →
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
