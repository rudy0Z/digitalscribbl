import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function AdminErrorsPage() {
  const { supabase, user } = await requirePageUser()

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const { data: logs } = await supabase
    .from('error_logs')
    .select('id, user_id, route, error_code, message, metadata, user_agent, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = Array.from(new Set((logs ?? []).map(log => log.user_id).filter(Boolean))) as string[]
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, display_name, email').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-display font-bold text-lg">scribbl</Link>
          <span className="text-ink-500 text-xs">/ admin / errors</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="hover:text-gray-300 transition">Dashboard</Link>
          <Link href="/admin/users" className="hover:text-gray-300 transition">Users</Link>
          <Link href="/admin/moderation" className="hover:text-gray-300 transition">Moderation</Link>
          <Link href="/admin/yearbook" className="hover:text-gray-300 transition">Yearbook</Link>
          <Link href="/admin/errors" className="text-white font-semibold">Errors</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sanitized app/API errors reported during testing. Do not log secrets here.
          </p>
        </div>

        <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {(logs?.length ?? 0) === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No error logs yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs!.map(log => {
                const actor = log.user_id ? userMap.get(log.user_id) : null
                return (
                  <article key={log.id} className="px-4 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">{log.message}</p>
                          {log.error_code && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              {log.error_code}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{log.route}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {actor ? `${actor.display_name} · ${actor.email}` : 'Unauthenticated or unknown user'}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    {log.metadata && JSON.stringify(log.metadata) !== '{}' && (
                      <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-gray-950 p-3 text-[11px] leading-5 text-gray-100">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                    {log.user_agent && <p className="mt-2 truncate text-[10px] text-gray-300">{log.user_agent}</p>}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
