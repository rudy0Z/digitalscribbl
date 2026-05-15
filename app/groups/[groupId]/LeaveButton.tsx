'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LeaveButton({ groupId }: { groupId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const router = useRouter()

  async function leave() {
    setLoading(true)
    const res = await fetch('/api/groups/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId }),
    })
    if (res.ok) {
      router.push('/groups')
      router.refresh()
    } else {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-400 hover:text-red-500 transition"
      >
        Leave group
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Are you sure?</span>
      <button
        disabled={loading}
        onClick={leave}
        className="text-xs text-red-600 font-medium hover:underline"
      >
        {loading ? 'Leaving…' : 'Yes, leave'}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:underline">
        Cancel
      </button>
    </div>
  )
}
