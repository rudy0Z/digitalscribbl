import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import UserActions from './UserActions'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

const PAGE_SIZE = 30

export default async function AdminUsersPage({ searchParams }: Props) {
  const { supabase, user } = await requirePageUser()
  const filters = await searchParams

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const page = Math.max(0, Number(filters.page ?? 0))

  let query = supabase
    .from('users')
    .select(`
      id, email, display_name, enrollment_number,
      is_admin, is_suspended, onboarding_completed, last_seen, created_at,
      batches(label, graduation_year, programs(name, academic_groups(name)))
    `)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.q) {
    query = query.or(`display_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,enrollment_number.ilike.%${filters.q}%`)
  }

  const { data: users } = await query
  const { count: totalUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin nav */}
      <nav className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-display font-bold text-lg">scribbl</Link>
          <span className="text-ink-500 text-xs">/ admin / users</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin"            className="hover:text-gray-300 transition">Dashboard</Link>
          <Link href="/admin/users"      className="text-white font-semibold">Users</Link>
          <Link href="/admin/moderation" className="hover:text-gray-300 transition">Moderation</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Users <span className="text-gray-400 font-normal text-lg ml-1">({totalUsers ?? 0} total)</span>
          </h1>
        </div>

        {/* Search */}
        <form className="flex gap-3 mb-6">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by name, email, or enrollment number…"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">Search</button>
          {filters.q && (
            <Link href="/admin/users" className="btn-secondary">Clear</Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Program / Batch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map(u => {
                const batch = u.batches as unknown as {
                  label: string | null
                  graduation_year: number
                  programs: { name: string; academic_groups: { name: string } }
                } | null

                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{u.display_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        {u.enrollment_number && (
                          <p className="text-xs text-gray-400">{u.enrollment_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {batch ? (
                        <div>
                          <p className="text-gray-700">{batch.programs.name}</p>
                          <p className="text-xs text-gray-400">
                            {batch.label ?? batch.graduation_year}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.is_admin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                            Admin
                          </span>
                        )}
                        {u.is_suspended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            Suspended
                          </span>
                        )}
                        {!u.onboarding_completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                            Onboarding
                          </span>
                        )}
                        {!u.is_admin && !u.is_suspended && u.onboarding_completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserActions
                        userId={u.id}
                        currentUserId={user.id}
                        isAdmin={u.is_admin}
                        isSuspended={u.is_suspended}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {(users?.length ?? 0) === 0 && (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">
              No users found.
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-3 mt-6">
          {page > 0 && (
            <Link
              href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), page: String(page - 1) })}`}
              className="btn-secondary"
            >
              ← Prev
            </Link>
          )}
          {(users?.length ?? 0) === PAGE_SIZE && (
            <Link
              href={`?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), page: String(page + 1) })}`}
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
