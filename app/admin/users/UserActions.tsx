'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface UserActionsProps {
  userId:        string
  currentUserId: string
  isAdmin:       boolean
  isSuspended:   boolean
}

export default function UserActions({ userId, currentUserId, isAdmin, isSuspended }: UserActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Prevent modifying self
  if (userId === currentUserId) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const act = async (action: string) => {
    setError(null)
    const res = await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, action }),
    })
    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Action failed')
    } else {
      startTransition(() => router.refresh())
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {error && <span className="text-xs text-red-500">{error}</span>}

      {/* Suspend / Unsuspend */}
      {isSuspended ? (
        <button
          disabled={isPending}
          onClick={() => act('unsuspend')}
          className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
        >
          Unsuspend
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => act('suspend')}
          className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
        >
          Suspend
        </button>
      )}

      {/* Grant / Revoke admin */}
      {isAdmin ? (
        <button
          disabled={isPending}
          onClick={() => act('remove_admin')}
          className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
        >
          Remove admin
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => act('make_admin')}
          className="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition disabled:opacity-50"
        >
          Make admin
        </button>
      )}
    </div>
  )
}
