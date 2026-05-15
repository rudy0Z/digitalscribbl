'use client'

import { useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, Upload, X } from 'lucide-react'

interface HeadCropUploadProps {
  side: 'front' | 'back'
  currentUrl: string | null
  onUploaded?: (url: string) => void
}

const PREVIEW_SIZE = 280
const EXPORT_SIZE = 512

export default function HeadCropUpload({ side, currentUrl, onUploaded }: HeadCropUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [source, setSource] = useState<string | null>(null)
  const [scale, setScale] = useState(1.1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  function openFile(file: File) {
    setError(null)
    setSuccess(false)
    const reader = new FileReader()
    reader.onload = () => {
      setSource(String(reader.result))
      setScale(1.1)
      setOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  async function exportCroppedBlob(): Promise<Blob | null> {
    const image = imageRef.current
    if (!image) return null

    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_SIZE
    canvas.height = EXPORT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const naturalW = image.naturalWidth
    const naturalH = image.naturalHeight
    const baseScale = Math.max(PREVIEW_SIZE / naturalW, PREVIEW_SIZE / naturalH)
    const renderedW = naturalW * baseScale * scale
    const renderedH = naturalH * baseScale * scale
    const left = (PREVIEW_SIZE - renderedW) / 2 + offset.x
    const top = (PREVIEW_SIZE - renderedH) / 2 + offset.y
    const sx = Math.max(0, (-left / renderedW) * naturalW)
    const sy = Math.max(0, (-top / renderedH) * naturalH)
    const sw = Math.min(naturalW - sx, (PREVIEW_SIZE / renderedW) * naturalW)
    const sh = Math.min(naturalH - sy, (PREVIEW_SIZE / renderedH) * naturalH)

    ctx.fillStyle = '#e8e5de'
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, EXPORT_SIZE, EXPORT_SIZE)

    return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.88))
  }

  async function uploadCrop() {
    setLoading(true)
    setError(null)
    const blob = await exportCroppedBlob()
    if (!blob) {
      setLoading(false)
      setError('Could not crop this image.')
      return
    }

    const form = new FormData()
    form.append('file', new File([blob], `${side}.webp`, { type: 'image/webp' }))
    form.append('side', side)

    const res = await fetch('/api/avatar/upload-head', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
      return
    }

    setPreview(data.url)
    setSource(null)
    setSuccess(true)
    onUploaded?.(data.url)
    setTimeout(() => setSuccess(false), 1800)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-ink-900"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${side} head`} className="h-full w-full object-cover" />
        ) : (
          <Upload className="mx-auto text-gray-400 transition-transform group-hover:scale-110" size={24} />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-900 border-t-transparent" />
          </div>
        )}
        {success && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-xl text-white">✓</div>
        )}
      </button>
      <span className="text-xs capitalize text-gray-500">{side}</span>
      {error && <p className="max-w-[180px] text-center text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) openFile(file)
          e.target.value = ''
        }}
      />

      {source && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900">Fit your {side} head</h2>
                <p className="mt-1 text-sm text-gray-500">Drag and zoom until only your head and neck sit inside the frame.</p>
              </div>
              <button type="button" onClick={() => setSource(null)} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div
              className="relative mx-auto overflow-hidden rounded-full border-4 border-ink-900 bg-[#e8e5de]"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: 'none' }}
              onPointerDown={e => {
                e.currentTarget.setPointerCapture(e.pointerId)
                setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
              }}
              onPointerMove={e => {
                if (!dragStart) return
                setOffset({
                  x: dragStart.ox + e.clientX - dragStart.x,
                  y: dragStart.oy + e.clientY - dragStart.y,
                })
              }}
              onPointerUp={() => setDragStart(null)}
              onPointerCancel={() => setDragStart(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={source}
                alt=""
                className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
                draggable={false}
                style={{
                  width: `${scale * 100}%`,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-x-14 bottom-10 h-px bg-white/80" />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={() => setScale(s => Math.max(0.75, s - 0.1))} className="rounded-xl border border-gray-200 p-2">
                <Minus size={16} />
              </button>
              <input
                type="range"
                min={0.75}
                max={2.6}
                step={0.05}
                value={scale}
                onChange={e => setScale(Number(e.target.value))}
                className="flex-1 accent-ink-900"
              />
              <button type="button" onClick={() => setScale(s => Math.min(2.6, s + 0.1))} className="rounded-xl border border-gray-200 p-2">
                <Plus size={16} />
              </button>
              <button type="button" onClick={() => { setScale(1.1); setOffset({ x: 0, y: 0 }) }} className="rounded-xl border border-gray-200 p-2">
                <RotateCcw size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={uploadCrop}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Use this crop'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
