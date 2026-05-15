'use client'

import { useState } from 'react'

export default function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/groups/join/${token}`
    : `/groups/join/${token}`

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <span className="flex-1 text-xs font-mono text-gray-500 truncate">/groups/join/{token.slice(0, 8)}…</span>
      <button
        onClick={copy}
        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-ink-900 text-white hover:bg-ink-700'
        }`}
      >
        {copied ? '✓ Copied!' : '📋 Copy link'}
      </button>
    </div>
  )
}
