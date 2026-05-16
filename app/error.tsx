'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/errors/report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        error_code: error.digest ?? 'CLIENT_RENDER_ERROR',
        message: error.message,
        metadata: { digest: error.digest },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="grid min-h-screen place-items-center bg-cream-50 px-4">
      <section className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Something broke</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">Try that again</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          The app caught this error and logged it for review. Your data should still be safe.
        </p>
        <button onClick={reset} className="btn-primary mt-5">
          Retry
        </button>
      </section>
    </main>
  )
}
