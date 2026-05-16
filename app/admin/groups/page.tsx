import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function AdminGroupsPage() {
  const { supabase, user } = await requirePageUser()

  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/dashboard')

  const [{ data: groups }, { data: batches }] = await Promise.all([
    supabase
      .from('friend_groups')
      .select('id, name, admin_id, invite_token, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('batches')
      .select('id, graduation_year, label, programs(name, academic_groups(name))')
      .order('graduation_year', { ascending: false }),
  ])

  const adminIds = Array.from(new Set((groups ?? []).map(group => group.admin_id)))
  const groupIds = (groups ?? []).map(group => group.id)

  const [{ data: admins }, { data: members }] = await Promise.all([
    adminIds.length
      ? supabase.from('users').select('id, display_name, email').in('id', adminIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from('friend_group_members').select('group_id, user_id').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),
  ])

  const adminsById = new Map((admins ?? []).map(admin => [admin.id, admin]))
  const memberCounts = new Map<string, number>()
  for (const member of members ?? []) {
    memberCounts.set(member.group_id, (memberCounts.get(member.group_id) ?? 0) + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-ink-900 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-lg font-bold">scribbl</Link>
            <span className="text-xs text-ink-500">/ admin / groups</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/users" className="transition hover:text-gray-300">Users</Link>
            <Link href="/admin/moderation" className="transition hover:text-gray-300">Moderation</Link>
            <Link href="/admin/yearbook" className="transition hover:text-gray-300">Yearbook</Link>
            <Link href="/admin/errors" className="transition hover:text-gray-300">Errors</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups and batches</h1>
          <p className="mt-1 text-sm text-gray-500">
            Friend groups are user-made. Batch and college groups come from the academic tables users choose during onboarding.
          </p>
        </div>

        <section className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Friend groups</h2>
          <div className="mt-4 divide-y divide-gray-50">
            {(groups ?? []).map(group => {
              const admin = adminsById.get(group.admin_id)
              const tokenPreview = group.invite_token ? `${group.invite_token.slice(0, 8)}…` : 'No token'
              return (
                <div key={group.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/groups/${group.id}`} className="font-medium text-gray-900 hover:underline">
                      {group.name}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">
                      Maker: {admin?.display_name ?? 'Unknown'} · {admin?.email ?? 'No email'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {memberCounts.get(group.id) ?? 0} members · invite {tokenPreview} · created {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/groups/${group.id}`} className="btn-secondary text-xs">
                    Open group
                  </Link>
                </div>
              )
            })}
            {(groups?.length ?? 0) === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No friend groups created yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Automatic academic groups</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(batches ?? []).map(batch => {
              const program = batch.programs as unknown as { name: string; academic_groups: { name: string } } | null
              return (
                <div key={batch.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {batch.label ?? `${batch.graduation_year} Batch`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {program?.name ?? 'Program not linked'} · {program?.academic_groups?.name ?? 'Academic group not linked'}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    These are not manually managed friend groups. Users enter them through onboarding.
                  </p>
                </div>
              )
            })}
            {(batches?.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400">No batches configured yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
