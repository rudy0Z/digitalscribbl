import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import { ROUTES } from '@/lib/constants'
import BatchSelect from './BatchSelect'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ batch?: string }>
}

export default async function AdminYearbookPage({ searchParams }: Props) {
  const { supabase, user } = await requirePageUser()
  const filters = await searchParams

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  // Fetch all batches for the dropdown
  const { data: batches } = await supabase
    .from('batches')
    .select('id, label, graduation_year, programs(name, academic_groups(name))')
    .order('graduation_year', { ascending: false })

  const activeBatchId = filters.batch ?? ''

  // Fetch students in selected batch (or all batches)
  let usersQ = supabase
    .from('users')
    .select(`
      id, display_name, body_style, shirt_color, head_front_url,
      yearbook_quote, email, batch_id,
      batches(label, graduation_year, programs(name))
    `)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .order('display_name')

  if (activeBatchId) usersQ = usersQ.eq('batch_id', activeBatchId)

  const { data: users } = await usersQ

  // Per-batch stats (for the summary cards)
  const batchStats: Record<string, { total: number; withQuote: number }> = {}
  for (const u of users ?? []) {
    const bid = u.batch_id ?? '__none__'
    if (!batchStats[bid]) batchStats[bid] = { total: 0, withQuote: 0 }
    batchStats[bid].total++
    if (u.yearbook_quote) batchStats[bid].withQuote++
  }

  const totalStudents  = users?.length ?? 0
  const withQuote      = (users ?? []).filter(u => u.yearbook_quote).length
  const quotePercent   = totalStudents > 0 ? Math.round((withQuote / totalStudents) * 100) : 0

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin nav */}
      <nav className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-display font-bold text-lg">scribbl</Link>
          <span className="text-ink-500 text-xs">/ admin / yearbook</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin"            className="hover:text-gray-300 transition">Dashboard</Link>
          <Link href="/admin/users"      className="hover:text-gray-300 transition">Users</Link>
          <Link href="/admin/moderation" className="hover:text-gray-300 transition">Moderation</Link>
          <Link href="/admin/yearbook"   className="text-white font-semibold">Yearbook</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header + batch picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yearbook</h1>
            <p className="text-sm text-gray-500 mt-0.5">{batchLabel} · {totalStudents} students</p>
          </div>
          <div className="flex items-center gap-3">
            <BatchSelect
              batches={(batches ?? []).map(b => {
                const bb = b as unknown as {
                  id: string
                  label: string | null
                  graduation_year: number
                  programs: { name: string }
                }
                return { id: bb.id, label: bb.label, graduation_year: bb.graduation_year, programName: bb.programs.name }
              })}
              activeBatchId={activeBatchId}
            />

            {/* Bulk export button */}
            <a
              href={`/api/yearbook/export${activeBatchId ? `?batchId=${activeBatchId}` : ''}`}
              className="btn-primary text-sm whitespace-nowrap"
              title={`Download all ${totalStudents} cards as a ZIP`}
            >
              ⬇ Export ZIP ({totalStudents})
            </a>

            {/* Public yearbook link */}
            <Link
              href={`/yearbook${activeBatchId ? `?batch=${activeBatchId}` : ''}`}
              className="btn-secondary text-sm whitespace-nowrap"
              target="_blank"
            >
              View public →
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total students', value: totalStudents, icon: '👥' },
            { label: 'Quotes filled', value: withQuote, icon: '💬' },
            {
              label: 'Quote completion',
              value: `${quotePercent}%`,
              icon: quotePercent === 100 ? '✅' : quotePercent >= 70 ? '📈' : '⚠️',
              alert: quotePercent < 50,
            },
            {
              label: 'No quote yet',
              value: totalStudents - withQuote,
              icon: '📝',
              alert: (totalStudents - withQuote) > 0,
            },
          ].map(stat => (
            <div
              key={stat.label}
              className={`bg-white rounded-xl p-4 border ${stat.alert ? 'border-yellow-200' : 'border-gray-100'}`}
            >
              <p className="text-2xl">{stat.icon}</p>
              <p className={`text-3xl font-bold mt-1 ${stat.alert ? 'text-yellow-600' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quote-missing alert */}
        {(totalStudents - withQuote) > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <span>
              <strong>{totalStudents - withQuote} student{totalStudents - withQuote !== 1 ? 's' : ''}</strong> haven&apos;t set a yearbook quote yet.
              Their cards will export with a blank quote field.
              Remind them via the{' '}
              <Link href="/admin" className="underline">admin dashboard</Link> announcement tool.
            </span>
          </div>
        )}

        {/* Batch-level summary when viewing all */}
        {!activeBatchId && (batches?.length ?? 0) > 1 && (
          <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Per-batch breakdown</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {batches?.map(b => {
                const bb = b as unknown as {
                  id: string
                  label: string | null
                  graduation_year: number
                  programs: { name: string }
                }
                const stats  = batchStats[bb.id]
                if (!stats) return null
                const pct    = stats.total > 0 ? Math.round((stats.withQuote / stats.total) * 100) : 0
                const label  = bb.label ?? String(bb.graduation_year)
                return (
                  <div key={bb.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{bb.programs.name} · {label}</p>
                      <p className="text-xs text-gray-400">{stats.total} students · {stats.withQuote}/{stats.total} quotes ({pct}%)</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quote completion bar */}
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <a
                        href={`/api/yearbook/export?batchId=${bb.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        ⬇ ZIP
                      </a>
                      <Link
                        href={`/admin/yearbook?batch=${bb.id}`}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Student grid */}
        {totalStudents === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📖</p>
            <p>No students in this batch yet.</p>
          </div>
        ) : (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Student cards
              <span className="ml-2 text-gray-400 font-normal">
                · click a card to view profile · download individual PNGs from the links below each card
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {(users ?? []).map(u => {
                const batch       = u.batches as unknown as { label: string | null; graduation_year: number; programs: { name: string } } | null
                const bl          = batch ? (batch.label ?? String(batch.graduation_year)) : ''
                const scribbles   = countMap[u.id] ?? 0
                const hasQuote    = !!u.yearbook_quote

                return (
                  <div key={u.id} className="flex flex-col">
                    {/* Card (links to profile) */}
                    <Link
                      href={ROUTES.profile(u.id)}
                      target="_blank"
                      className="group flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition flex-1"
                    >
                      <AvatarDisplay
                        bodyStyle={u.body_style}
                        shirtColor={u.shirt_color}
                        headFrontUrl={u.head_front_url}
                        scribbleCount={scribbles}
                        size="sm"
                        className="mx-auto group-hover:scale-105 transition-transform"
                      />
                      <div className="text-center w-full">
                        <p className="text-xs font-semibold text-ink-900 truncate">{u.display_name}</p>
                        {bl && (
                          <p className="text-[10px] text-gray-400 truncate">{bl}</p>
                        )}
                        {hasQuote ? (
                          <p className="text-[10px] text-gray-400 italic line-clamp-2 mt-0.5 leading-tight">
                            &ldquo;{u.yearbook_quote}&rdquo;
                          </p>
                        ) : (
                          <p className="text-[10px] text-yellow-500 mt-0.5 font-medium">No quote yet</p>
                        )}
                        <p className="text-[9px] text-gray-300 mt-1">{scribbles} scribble{scribbles !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>

                    {/* Download link below card */}
                    <a
                      href={`/api/avatar/export?userId=${u.id}&panel=front`}
                      className="mt-1.5 text-center text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                      title={`Download ${u.display_name}'s card`}
                    >
                      ⬇ PNG
                    </a>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* No-quote list (only when batch selected) */}
        {activeBatchId && (totalStudents - withQuote) > 0 && (
          <section className="bg-white rounded-xl border border-yellow-100">
            <div className="px-4 py-3 border-b border-yellow-100">
              <h2 className="text-sm font-semibold text-yellow-700">
                Students without a yearbook quote ({totalStudents - withQuote})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(users ?? []).filter(u => !u.yearbook_quote).map(u => (
                <div key={u.id} className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{u.display_name}</span>
                    <span className="text-gray-400 text-xs ml-2">{u.email}</span>
                  </div>
                  <Link
                    href={ROUTES.profile(u.id)}
                    target="_blank"
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    View profile →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
