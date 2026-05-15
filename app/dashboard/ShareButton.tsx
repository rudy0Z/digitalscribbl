'use client'

import { useState } from 'react'

interface ShareButtonProps {
  profileUrl: string
}

export default function ShareButton({ profileUrl }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard not available — fail silently */
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-secondary text-xs px-3 py-1.5"
    >
      {copied ? '✓ Copied!' : '📋 Share link'}
    </button>
  )
}
