'use client'

import { useState } from 'react'

export function ToggleScribbling({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled)

  const toggle = async () => {
    const next = !on
    setOn(next)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'scribbling_enabled', value: next }),
    })
  }

  return (
    <button
      onClick={toggle}
      className={`relative w-12 h-6 rounded-full transition ${on ? 'bg-green-500' : 'bg-red-400'}`}
      aria-label={on ? 'Disable scribbling' : 'Enable scribbling'}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  )
}

export function SetDeadline({ currentDeadline }: { currentDeadline: string | null }) {
  const [date, setDate] = useState(currentDeadline?.split('T')[0] ?? '')

  const save = async () => {
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'deadline_date', value: date || null }),
    })
  }

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="input text-sm w-40"
      />
      <button onClick={save} className="btn-primary text-xs px-3">Save</button>
    </div>
  )
}
