import { redirect } from 'next/navigation'
import { requirePageUser } from '@/lib/auth/server'
import ModerationAction from './ModerationAction'
import UserReportAction from './UserReportAction'

export const dynamic = 'force-dynamic'

export default async function ModerationPage() {
  const { supabase, user } = await requirePageUser()

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const { data: flagged } = await supabase
    .from('scribbles')
    .select(`
      id, panel, x, y, w, h, flag_count, created_at, is_hidden,
      users!scribbles_scribbler_id_fkey(id, display_name),
      shirts!inner(owner_id, users!inner(id, display_name))
    `)
    .eq('is_flagged', true)
    .order('flag_count', { ascending: false })
    .limit(50)

  const { data: userReports } = await supabase
    .from('user_reports')
    .select(`
      id, reason, status, created_at,
      reporter:users!user_reports_reporter_id_fkey(id, display_name, email),
      reported:users!user_reports_reported_user_id_fkey(id, display_name, email, is_suspended)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Moderation queue</h1>

        {(flagged?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">No flagged scribbles — all clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flagged!.map(s => {
              const scribbler = s.users as unknown as { id: string; display_name: string }
              const shirt     = s.shirts as unknown as { owner_id: string; users: { id: string; display_name: string } }
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                  {/* Canvas preview placeholder */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    {s.w}×{s.h}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {scribbler.display_name} → {shirt.users.display_name}&apos;s {s.panel}
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      🚩 {s.flag_count} report{s.flag_count !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString()}
                      {s.is_hidden && ' · Currently hidden'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ModerationAction scribbleId={s.id} action="dismiss" label="Dismiss" />
                    <ModerationAction scribbleId={s.id} action="remove"  label="Remove" danger />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">User reports</h2>
          {(userReports?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">No open user reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReports!.map(report => {
                const reporter = report.reporter as unknown as { display_name: string; email: string }
                const reported = report.reported as unknown as { display_name: string; email: string; is_suspended: boolean }
                return (
                  <div key={report.id} className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {reporter.display_name} reported {reported.display_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {reporter.email} → {reported.email}
                          {reported.is_suspended && ' · reported user is suspended'}
                        </p>
                        <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{report.reason}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <UserReportAction reportId={report.id} action="dismiss" label="Dismiss" />
                        <UserReportAction reportId={report.id} action="suspend" label="Suspend user" danger />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
