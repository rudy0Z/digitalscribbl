'use client'

import { useState } from 'react'

export default function RequestScribbleButton({ ownerId }: { ownerId: string }) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'loading'>('idle')

  const send = async () => {
    setStatus('loading')
    const res = await fetch('/api/scribble/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: ownerId }),
    })
    setStatus(res.ok ? 'sent' : 'idle')
  }

  if (status === 'sent') {
    return <p className="text-center text-xs text-gray-500 py-2">📬 Request sent!</p>
  }

  return (
    <button
      onClick={send}
      disabled={status === 'loading'}
      className="btn-secondary w-full text-xs"
    >
      {status === 'loading' ? '…' : '📬 Request to scribble'}
    </button>
  )
}
