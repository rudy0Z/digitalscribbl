'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { getAllowedEmailDomains, isAllowedEmailDomain } from '@/lib/utils/safetyAccess'

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:   'Sign-in failed. Please try again.',
  missing_code:  'Something went wrong with the sign-in flow. Please try again.',
  missing_email: 'Your provider did not return an email address.',
  profile_create_failed: 'Could not create your account. Please try again.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const errorKey = searchParams.get('error')
  const errorMsg = errorKey ? ERROR_MESSAGES[errorKey] : null

  const [loading, setLoading] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)
  const supabase = createClient()
  const showDevTesting = process.env.NODE_ENV !== 'production'
  const allowedDomains = getAllowedEmailDomains()
  const primaryDomain = allowedDomains[0] ?? 'your college domain'

  const signIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      console.error(error)
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    const email = otpEmail.trim().toLowerCase()
    setOtpMessage(null)
    if (!isAllowedEmailDomain(email, allowedDomains)) {
      setOtpMessage(`Use your ${primaryDomain} email for the first profile verification. Guests can continue with Google.`)
      return
    }

    setOtpLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    setOtpLoading(false)
    if (error) {
      setOtpMessage(error.message)
      return
    }
    setOtpSent(true)
    setOtpMessage('Code sent. Check your university mailbox.')
  }

  const verifyOtp = async () => {
    const email = otpEmail.trim().toLowerCase()
    const token = otpCode.trim()
    setOtpMessage(null)
    if (!email || !token) {
      setOtpMessage('Enter your email and the code from your mailbox.')
      return
    }

    setOtpLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setOtpLoading(false)
      setOtpMessage(error.message)
      return
    }

    const res = await fetch('/api/auth/sync-user', { method: 'POST' })
    const data = await res.json().catch(() => null)
    setOtpLoading(false)
    if (!res.ok || !data?.next) {
      setOtpMessage(data?.error ?? 'Could not finish sign in.')
      return
    }
    window.location.href = data.next
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-bold text-ink-900 tracking-tight">
            scribbl
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Sign your batchmates&apos; virtual shirts ✏️
          </p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-ink-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-400 mb-6">
            First profile setup uses your university email OTP. Google can be linked for quick returns or guest access.
          </p>

          {errorMsg && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">University email</label>
              <input
                className="input"
                type="email"
                value={otpEmail}
                onChange={e => setOtpEmail(e.target.value)}
                placeholder={`name@${primaryDomain}`}
              />
            </div>
            {otpSent && (
              <div>
                <label className="label">One-time code</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="6 digit code"
                />
              </div>
            )}
            {otpMessage && (
              <p className="rounded-xl border border-gray-100 bg-cream-50 px-3 py-2 text-xs text-gray-600">
                {otpMessage}
              </p>
            )}
            <button
              onClick={otpSent ? verifyOtp : sendOtp}
              disabled={otpLoading}
              className="btn-primary w-full"
            >
              {otpLoading ? 'Please wait…' : otpSent ? 'Verify and continue' : 'Send university OTP'}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm text-ink-900 transition shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-center text-gray-400">
            Non-university Google accounts can view and request access, but cannot create a shirt profile.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Built for one farewell. Designed to last forever.
        </p>
        {showDevTesting && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Dev testing: <Link href="/dev/test-users" className="underline underline-offset-2">switch local test users</Link>
          </p>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
      <LoginContent />
    </Suspense>
  )
}
