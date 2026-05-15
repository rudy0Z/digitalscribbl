'use client'

import { useState } from 'react'

export default function ModerationAction({
  scribbleId, action, label, danger = false
}: { scribbleId: string; action: string; label: string; danger?: boolean }) {
  const [done, setDone] = useState(false)

  if (done) return <span className="text-xs text-gray-400">Done</span>

  return (
    <button
      onClick={async () => {
        await fetch('/api/admin/moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scribble_id: scribbleId, action }),
        })
        setDone(true)
      }}
      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}
