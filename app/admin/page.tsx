import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import { ToggleScribbling, SetDeadline } from './AdminControls'
import { ROUTES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { supabase, user } = await requirePageUser()

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  // Dashboard metrics
  const [
    { count: totalUsers },
    { count: totalScribbles },
    { count: pendingReports },
    { count: todayScribbles },
    { data: settings },
    { data: recentScribbles },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('onboarding_completed', true),
    supabase.from('scribbles').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
    supabase.from('scribbles').select('id', { count: 'exact', head: true }).eq('is_flagged', true).eq('is_hidden', false),
    supabase.from('scribbles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('platform_settings').select('key, value'),
    supabase.from('scribbles')
      .select(`id, created_at, panel, users!scribbles_scribbler_id_fkey(display_name), shirts!inner(owner_id, users!inner(display_name))`)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const scribbling  = settingsMap['scribbling_enabled'] !== false
  const deadline    = settingsMap['deadline_date'] as string | null ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin nav */}
      <nav className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-display font-bold text-lg">scribbl</Link>
          <span className="text-ink-500 text-xs">/ admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/users"       className="hover:text-gray-300 transition">Users</Link>
          <Link href="/admin/moderation"  className="hover:text-gray-300 transition">
            Moderation {(pendingReports ?? 0) > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReports}</span>
            )}
          </Link>
          <Link href="/admin/yearbook"    className="hover:text-gray-300 transition">Yearbook</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total students', value: totalUsers ?? 0, icon: '👥' },
            { label: 'Total scribbles', value: totalScribbles ?? 0, icon: '✏️' },
            { label: 'Scribbles today', value: todayScribbles ?? 0, icon: '📅' },
            { label: 'Flagged (pending)', value: pendingReports ?? 0, icon: '🚩', alert: (pendingReports ?? 0) > 0 },
          ].map(m => (
            <div key={m.label} className={`bg-white rounded-xl p-4 border ${m.alert ? 'border-red-200' : 'border-gray-100'}`}>
              <p className="text-2xl">{m.icon}</p>
              <p className={`text-3xl font-bold mt-1 ${m.alert ? 'text-red-600' : 'text-gray-900'}`}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Platform controls */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform controls</h2>
          <div className="space-y-4">
            {/* Global lock */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Global scribbling</p>
                <p className="text-xs text-gray-500">Instantly halt or resume all scribbling</p>
              </div>
              <ToggleScribbling enabled={scribbling} />
            </div>

            {/* Deadline */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm text-gray-900">Deadline date</p>
                <p className="text-xs text-gray-500">
                  After this date, all shirts auto-lock globally.{' '}
                  {deadline ? `Currently: ${new Date(deadline).toLocaleDateString()}` : 'Not set.'}
                </p>
              </div>
              <SetDeadline currentDeadline={deadline} />
            </div>
          </div>
        </section>

        {/* Recent activity */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent scribbles</h2>
          <div className="divide-y divide-gray-50">
            {(recentScribbles ?? []).map(s => {
              const scribbler = (s.users as unknown as { display_name: string }).display_name
              const shirt     = s.shirts as unknown as { owner_id: string; users: { display_name: string } }
              return (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium text-gray-900">{scribbler}</span>
                    <span className="text-gray-400"> scribbled on </span>
                    <span className="font-medium text-gray-900">{shirt.users.display_name}</span>
                    <span className="text-gray-400">&apos;s {s.panel}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
