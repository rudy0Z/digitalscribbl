'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RemoveMemberButton({
  groupId,
  userId,
  name,
}: {
  groupId: string
  userId: string
  name: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const remove = async () => {
    if (!confirm(`Remove ${name} from this group?`)) return
    setLoading(true)
    const res = await fetch('/api/groups/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: userId }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.error ?? 'Could not remove member')
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="rounded-full border border-red-100 bg-white px-2 py-1 text-[10px] font-medium text-red-600 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
    >
      {loading ? '…' : 'Remove'}
    </button>
  )
}
