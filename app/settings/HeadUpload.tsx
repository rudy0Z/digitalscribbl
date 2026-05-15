'use client'

import { useState, useRef } from 'react'

interface Props {
  side:       'front' | 'back'
  currentUrl: string | null
}

export default function HeadUpload({ side, currentUrl }: Props) {
  const [preview, setPreview]   = useState<string | null>(currentUrl)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData()
    form.append('file', file)
    form.append('side', side)

    const res = await fetch('/api/avatar/upload-head', { method: 'POST', body: form })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
    } else {
      setPreview(data.url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-ink-900 transition-all bg-gray-50 group"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${side} head`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-2xl group-hover:scale-110 transition-transform">📸</span>
        )}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {success && (
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center text-white text-xl">✓</div>
        )}
      </button>
      <span className="text-xs text-gray-500 capitalize">{side}</span>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
