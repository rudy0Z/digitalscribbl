'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export function CreateGroupForm() {
  const [name,   setName]   = useState('')
  const [error,  setError]  = useState<string | null>(null)
  const [open,   setOpen]   = useState(false)
  const [pending, start]    = useTransition()
  const router = useRouter()

  async function handleCreate() {
    setError(null)
    const res = await fetch('/api/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    router.push(ROUTES.group(data.id))
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        ✨ Create group
      </button>
    )
  }

  return (
    <div className="card p-4 space-y-3 mt-2">
      <p className="text-sm font-semibold text-ink-900">New friend group</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && start(handleCreate)}
        maxLength={60}
        placeholder="Group name, e.g. 'The Usual Suspects'"
        className="input w-full text-sm"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || name.trim().length < 2}
          onClick={() => start(handleCreate)}
          className="btn-primary text-sm"
        >
          {pending ? 'Creating…' : 'Create'}
        </button>
        <button onClick={() => { setOpen(false); setName(''); setError(null) }} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function JoinGroupForm() {
  const [token,  setToken]  = useState('')
  const [error,  setError]  = useState<string | null>(null)
  const [open,   setOpen]   = useState(false)
  const [pending, start]    = useTransition()
  const router = useRouter()

  async function handleJoin() {
    setError(null)
    // Accept full URL or raw token
    const parsed = token.includes('/groups/join/')
      ? token.split('/groups/join/').pop()?.split('?')[0] ?? token
      : token.trim()

    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_token: parsed }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    router.push(ROUTES.group(data.id))
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        🔗 Join with link
      </button>
    )
  }

  return (
    <div className="card p-4 space-y-3 mt-2">
      <p className="text-sm font-semibold text-ink-900">Join a group</p>
      <input
        autoFocus
        value={token}
        onChange={e => setToken(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && start(handleJoin)}
        placeholder="Paste invite link or token…"
        className="input w-full text-sm"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !token.trim()}
          onClick={() => start(handleJoin)}
          className="btn-primary text-sm"
        >
          {pending ? 'Joining…' : 'Join'}
        </button>
        <button onClick={() => { setOpen(false); setToken(''); setError(null) }} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
