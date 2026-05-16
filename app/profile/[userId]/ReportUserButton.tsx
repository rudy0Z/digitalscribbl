'use client'

import { useState } from 'react'

export default function ReportUserButton({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async () => {
    setMessage(null)
    setLoading(true)
    const res = await fetch('/api/users/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reported_user_id: userId, reason }),
    })
    const data = await res.json().catch(() => null)
    setLoading(false)
    if (!res.ok) {
      setMessage(data?.error ?? 'Could not submit report')
      return
    }
    setReason('')
    setOpen(false)
    setMessage('Report sent to the admin queue.')
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-xs">
          Report user
        </button>
        {message && <p className="text-xs text-gray-400">{message}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-3">
      <p className="text-xs font-semibold text-red-700">Report {userName}</p>
      <textarea
        className="input mt-2 min-h-20 resize-none text-sm"
        value={reason}
        onChange={e => setReason(e.target.value)}
        maxLength={240}
        placeholder="What should the admin review?"
      />
      {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={submit} disabled={loading || !reason.trim()} className="btn-primary text-xs">
          {loading ? 'Sending…' : 'Submit report'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </div>
  )
}
