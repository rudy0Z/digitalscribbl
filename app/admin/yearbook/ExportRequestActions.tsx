'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function ExportRequestActions({
  requestId,
  currentStatus,
}: {
  requestId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(status: 'approved' | 'rejected' | 'fulfilled') {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/export-requests', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ request_id: requestId, status }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Could not update request')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus !== 'approved' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => update('approved')}
          className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {currentStatus !== 'fulfilled' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => update('fulfilled')}
          className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
        >
          Fulfilled
        </button>
      )}
      {currentStatus !== 'rejected' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => update('rejected')}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      )}
      {error && <span className="basis-full text-xs text-red-500">{error}</span>}
    </div>
  )
}
