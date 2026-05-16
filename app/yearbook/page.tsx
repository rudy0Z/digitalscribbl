import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import { ROUTES } from '@/lib/constants'
import YearbookControls from './YearbookControls'
import ExportRequestForm from './ExportRequestForm'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ batch?: string; group?: string }>
}

export default async function YearbookPage({ searchParams }: Props) {
  const { supabase, user } = await requirePageUser()
  const filters = await searchParams

  // Fetch viewer's batch for default filter
  const { data: me } = await supabase
    .from('users')
    .select('batch_id, batches(label, graduation_year, programs(name, academic_groups(name)))')
    .eq('id', user.id)
    .single()

  const defaultBatchId  = me?.batch_id ?? ''
  const activeBatchId   = filters.batch ?? defaultBatchId

  // Fetch all batches for the filter dropdown
  const { data: batches } = await supabase
    .from('batches')
    .select('id, label, graduation_year, programs(name, academic_groups(name))')
    .order('graduation_year', { ascending: false })

  // Fetch all onboarded, non-suspended users in the selected batch
  let usersQuery = supabase
    .from('users')
    .select(`
      id, display_name, body_style, shirt_color, head_front_url,
      yearbook_quote, batch_id,
      batches(label, graduation_year, programs(name)),
      shirts(front_texture_url, front_occupancy)
    `)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .order('display_name')

  if (activeBatchId) {
    usersQuery = usersQuery.eq('batch_id', activeBatchId)
  }

  const { data: users } = await usersQuery

  // Scribble counts in bulk
  const userIds = (users ?? []).map(u => u.id)
  const { data: scribblesData } = userIds.length
    ? await supabase.from('scribbles')
        .select('shirt_id, shirts!inner(owner_id)')
        .in('shirts.owner_id', userIds)
        .eq('is_hidden', false)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const s of scribblesData ?? []) {
    const oid = (s.shirts as unknown as { owner_id: string }).owner_id
    countMap[oid] = (countMap[oid] ?? 0) + 1
  }

  const activeBatch = batches?.find(b => b.id === activeBatchId)
  const batchLabel  = activeBatch
    ? ((activeBatch as unknown as { label: string | null; graduation_year: number }).label
        ?? String((activeBatch as unknown as { graduation_year: number }).graduation_year))
    : 'All batches'

  const { data: groupMemberships } = await supabase
    .from('friend_group_members')
    .select('friend_groups(id, name)')
    .eq('user_id', user.id)

  const exportGroups = (groupMemberships ?? [])
    .map(row => row.friend_groups as unknown as { id: string; name: string } | null)
    .filter((group): group is { id: string; name: string } => Boolean(group?.id))

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between print:hidden">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <YearbookControls
          batches={(batches ?? []).map(b => {
            const bb = b as unknown as { id: string; label: string | null; graduation_year: number; programs: { name: string } }
            return { id: bb.id, label: bb.label, graduation_year: bb.graduation_year, programName: bb.programs.name }
          })}
          activeBatchId={activeBatchId}
        />
      </nav>

      {/* Download all cards link */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink-900">Yearbook</h1>
          <p className="text-sm text-gray-500">{batchLabel} · {users?.length ?? 0} students</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/api/avatar/export?userId=${user.id}&panel=front`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            ⬇ My card (PNG)
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-3">
        <ExportRequestForm activeBatchId={activeBatchId} batchLabel={batchLabel} groups={exportGroups} />
      </div>

      {/* ── Yearbook grid ── */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Print header (visible only in print) */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900">{batchLabel}</h1>
          <p className="text-gray-500 mt-1">Scribbl · {new Date().getFullYear()}</p>
        </div>

        {(users?.length ?? 0) === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📖</p>
            <p>No students in this batch yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 print:grid-cols-4 print:gap-3">
            {(users ?? []).map(u => {
              const shirt      = (u.shirts as unknown as { front_texture_url: string | null }[] | null)?.[0]
              const textureUrl = shirt?.front_texture_url
              const scribbles  = countMap[u.id] ?? 0

              return (
                <Link
                  key={u.id}
                  href={ROUTES.profile(u.id)}
                  className="group flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition print:break-inside-avoid print:border print:border-gray-200"
                >
                  <div className="relative w-full">
                    <AvatarDisplay
                      bodyStyle={u.body_style}
                      shirtColor={u.shirt_color}
                      headFrontUrl={u.head_front_url}
                      scribbleCount={scribbles}
                      size="sm"
                      className="mx-auto group-hover:scale-105 transition-transform"
                    />
                    {textureUrl && (
                      <div className="absolute bottom-0 left-0 right-0 h-[60%] overflow-hidden rounded-b-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {/* Shirt preview on hover — just decorative */}
                      </div>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <p className="text-xs font-semibold text-ink-900 truncate">
                      {u.display_name}
                    </p>
                    {u.yearbook_quote ? (
                      <p className="text-[10px] text-gray-400 italic line-clamp-2 mt-0.5 leading-tight">
                        &ldquo;{u.yearbook_quote}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-300 mt-0.5">—</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:block text-center mt-12 text-xs text-gray-400 border-t border-gray-200 pt-4">
          Generated by scribbl · {new Date().toLocaleDateString()}
        </div>
      </main>

      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block !important; }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print\\:gap-3 { gap: 0.75rem !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
