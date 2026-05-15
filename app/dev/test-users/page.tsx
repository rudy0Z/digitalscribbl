import Link from 'next/link'
import { getAvailableDevAuthSlots, isDevAuthBypassEnabled } from '@/lib/auth/dev'

export default function DevTestUsersPage() {
  if (!isDevAuthBypassEnabled()) {
    return (
      <main className="min-h-screen bg-cream-50 px-4 py-12">
        <div className="max-w-xl mx-auto card p-6">
          <h1 className="text-xl font-display font-bold text-ink-900">Dev test users disabled</h1>
          <p className="text-sm text-gray-500 mt-2">
            Set `DEV_AUTH_BYPASS=true` plus at least one `DEV_AUTH_USER_n_ID` value in `.env.local`.
          </p>
        </div>
      </main>
    )
  }

  const slots = getAvailableDevAuthSlots()

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink-900">Dev test users</h1>
          <p className="text-sm text-gray-500 mt-2">
            Open one link per browser. Each browser keeps its own dev user cookie.
          </p>
        </div>

        <div className="grid gap-3">
          {slots.map(({ slot, userId }) => (
            <div key={slot} className="card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">User {slot}</p>
                <p className="text-xs text-gray-400 font-mono">{userId}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dev/as/${slot}?next=/dashboard`} className="btn-primary text-sm">
                  Open dashboard
                </Link>
                <Link href={`/dev/as/${slot}?next=/explore`} className="btn-secondary text-sm">
                  Open explore
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm">
          <Link href="/dev/logout" className="text-gray-500 hover:text-ink-900 transition">
            Clear dev user cookie
          </Link>
        </div>
      </div>
    </main>
  )
}
