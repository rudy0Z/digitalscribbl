import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import { ROUTES, ONLINE_THRESHOLD_MS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    q?:     string
    group?: string
    prog?:  string
    batch?: string
    page?:  string
  }>
}

const PAGE_SIZE = 24

export default async function ExplorePage({ searchParams }: Props) {
  const { supabase, user } = await requirePageUser()
  const filters = await searchParams

  const page  = Math.max(0, Number(filters.page ?? 0))
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

  if (filters.q) {
    query = query.ilike('display_name', `%${filters.q}%`)
  }
  if (filters.batch) {
    query = query.eq('batch_id', filters.batch)
  } else if (filters.prog) {
    query = query.eq('program_id', filters.prog)
  } else if (filters.group) {
    query = query.eq('academic_group_id', filters.group)
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
    filters.group
      ? supabase.from('programs').select('id, name').eq('academic_group_id', filters.group).order('name')
      : Promise.resolve({ data: [] }),
    filters.prog
      ? supabase.from('batches').select('id, label, graduation_year').eq('program_id', filters.prog).order('graduation_year', { ascending: false })
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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Explore shirts</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">Find someone to sign</h1>
            <p className="mt-2 text-sm text-gray-500">The fastest way to test the full journey is to jump between real profiles and leave visible marks.</p>
          </div>
          <Link href={ROUTES.dashboard} className="btn-secondary text-xs">
            Back to lobby
          </Link>
        </div>

        {/* Filters */}
        <form className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by name..."
            className="input flex-1 min-w-[200px] max-w-xs"
          />
          <select name="group" defaultValue={filters.group} className="input w-auto">
            <option value="">All groups</option>
            {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {programs && programs.length > 0 && (
            <select name="prog" defaultValue={filters.prog} className="input w-auto">
              <option value="">All programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {batches && batches.length > 0 && (
            <select name="batch" defaultValue={filters.batch} className="input w-auto">
              <option value="">All batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.label ?? b.graduation_year}</option>)}
            </select>
          )}
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <Search size={15} />
            Search
          </button>
        </form>

        {/* Shirt grid */}
        {(users?.length ?? 0) === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-white py-16 text-center text-gray-400">
            <Search size={34} className="mx-auto mb-3" />
            <p className="text-sm">No one found matching those filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users!.map(u => {
              const isOnline = u.last_seen && new Date(u.last_seen) > new Date(cutoff)
              const batch    = u.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null

              return (
                <Link
                  key={u.id}
                  href={ROUTES.profile(u.id)}
                  className="group overflow-hidden rounded-[24px] border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="flex items-center justify-center bg-[#f8f5ee] p-4">
                    <div className="relative">
                      <AvatarDisplay
                        bodyStyle={u.body_style}
                        shirtColor={u.shirt_color}
                        headFrontUrl={u.head_front_url}
                        scribbleCount={scribbleCountMap[u.id] ?? 0}
                        size="md"
                        className="transition-transform group-hover:scale-[1.03]"
                      />
                      {isOnline && (
                        <div className="absolute bottom-2 right-2 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-400" />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">{u.display_name}</p>
                        {batch && (
                          <p className="mt-1 truncate text-xs text-gray-500">{batch.programs.name} · {batch.label ?? batch.graduation_year}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-ink-900 px-2 py-1 text-[10px] font-semibold text-white">
                        Sign
                      </span>
                    </div>
                    {batch && (
                      <p className="mt-3 text-xs text-gray-400">{scribbleCountMap[u.id] ?? 0} scribbles received</p>
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
              href={`?${new URLSearchParams({ ...filters, page: String(page - 1) })}`}
              className="btn-secondary"
            >
              ← Prev
            </Link>
          )}
          {(users?.length ?? 0) === PAGE_SIZE && (
            <Link
              href={`?${new URLSearchParams({ ...filters, page: String(page + 1) })}`}
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
