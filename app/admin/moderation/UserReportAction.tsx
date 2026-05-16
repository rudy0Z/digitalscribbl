'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserReportAction({
  reportId,
  action,
  label,
  danger = false,
}: {
  reportId: string
  action: 'dismiss' | 'suspend'
  label: string
  danger?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (danger && !confirm('Suspend this user and close the report?')) return
    setLoading(true)
    const res = await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, action }),
    })
    setLoading(false)
    if (!res.ok) {
      alert('Could not update report')
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}
