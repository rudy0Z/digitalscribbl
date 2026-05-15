import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageUser } from '@/lib/auth/server'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import NotificationBell from '@/components/notifications/NotificationBell'
import ProfileForm from './ProfileForm'
import HeadUpload from './HeadUpload'
import { ROUTES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { supabase, user, isBypass } = await requirePageUser()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, yearbook_quote, shirt_permission, body_style, shirt_color, head_front_url, head_back_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: shirt } = await supabase
    .from('shirts')
    .select('id, shirt_number, is_locked')
    .eq('owner_id', user.id)
    .order('shirt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display font-bold text-xl text-ink-900">scribbl</Link>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.profile(user.id)} className="text-sm text-gray-500 hover:text-ink-900 transition">
            My shirt
          </Link>
          <NotificationBell userId={user.id} />
          <Link href={ROUTES.profile(user.id)}>
            <AvatarDisplay
              bodyStyle={profile.body_style}
              shirtColor={profile.shirt_color}
              headFrontUrl={profile.head_front_url}
              size="sm"
            />
          </Link>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href={ROUTES.profile(user.id)} className="text-gray-400 hover:text-gray-600 transition">←</Link>
          <h1 className="text-2xl font-display font-bold text-ink-900">Settings</h1>
        </div>

        {/* Head photos — separate from ProfileForm since they use their own upload flow */}
        <section className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-ink-900 mb-1">Face photos</h2>
          <p className="text-xs text-gray-400 mb-5">
            Your face is circle-cropped and placed on your avatar. Front is shown by default, back is revealed on the back panel.
          </p>
          <div className="flex gap-8 justify-center">
            <HeadUpload side="front" currentUrl={profile.head_front_url} />
            <HeadUpload side="back"  currentUrl={profile.head_back_url} />
          </div>
        </section>

        {/* All other editable settings */}
        <ProfileForm
          initial={{
            display_name:     profile.display_name,
            yearbook_quote:   profile.yearbook_quote,
            shirt_permission: profile.shirt_permission,
            body_style:       profile.body_style,
            shirt_color:      profile.shirt_color,
            shirt_id:         shirt?.id ?? null,
            shirt_locked:     shirt?.is_locked ?? false,
          }}
        />

        {/* Danger zone */}
        <section className="mt-8 p-4 border border-red-100 rounded-xl bg-red-50/50">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Account</h3>
          <p className="text-xs text-gray-500 mb-3">
            If you want to delete your account or have any issues, contact your admin.
          </p>
          <p className="text-xs text-gray-400">
            Signed in as <span className="font-mono">{user.email ?? (isBypass ? 'dev bypass user' : 'unknown')}</span>
          </p>
        </section>
      </main>
    </div>
  )
}
