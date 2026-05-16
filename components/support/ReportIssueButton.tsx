'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ReportIssueButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setStatus(null)
    setLoading(true)
    const res = await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: pathname,
        error_code: 'USER_REPORTED_ISSUE',
        message,
        metadata: {
          source: 'manual_report_button',
          href: window.location.href,
        },
      }),
    })
    setLoading(false)
    if (!res.ok) {
      setStatus('Could not send the issue.')
      return
    }
    setMessage('')
    setOpen(false)
    setStatus('Issue sent.')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-2xl border border-black/10 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-ink-900">Report a problem</p>
          <textarea
            className="input mt-3 min-h-24 resize-none text-sm"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={300}
            placeholder="What broke or felt confusing?"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={submit} disabled={loading || !message.trim()} className="btn-primary text-xs">
              {loading ? 'Sending…' : 'Send'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
      {status && !open && (
        <p className="rounded-full bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm">{status}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:text-ink-900"
      >
        Report issue
      </button>
    </div>
  )
}
