'use client'

import Image from 'next/image'
import { SHIRT_W, SHIRT_H } from '@/lib/constants'
import { cn } from '@/lib/utils/cn'

interface AvatarDisplayProps {
  bodyStyle:       string  // e.g. 'M1'
  shirtColor?:     string
  headFrontUrl?:   string | null
  headBackUrl?:    string | null
  showBack?:       boolean
  size?:           'sm' | 'md' | 'lg' | 'xl'
  className?:      string
  scribbleCount?:  number
}

const SIZES = {
  sm: { avatar: 80,  head: 28 },
  md: { avatar: 140, head: 48 },
  lg: { avatar: 220, head: 76 },
  xl: { avatar: 320, head: 110 },
}

// Placeholder SVG for missing head
const HEAD_PLACEHOLDER =
  `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#E5E7EB"/><text x="20" y="26" text-anchor="middle" font-size="20">😶</text></svg>')}`

export default function AvatarDisplay({
  bodyStyle,
  shirtColor = '#F8F8F8',
  headFrontUrl,
  headBackUrl,
  showBack = false,
  size     = 'lg',
  className,
  scribbleCount,
}: AvatarDisplayProps) {
  const { avatar: avatarPx, head: headPx } = SIZES[size]
  const headUrl = showBack ? (headBackUrl ?? headFrontUrl) : headFrontUrl
  const bodyPath = `/bodies/${bodyStyle.toLowerCase()}.svg`

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      style={{ width: avatarPx }}
    >
      {/* Body illustration */}
      <div
        className="relative w-full"
        style={{ aspectRatio: `${SHIRT_W}/${SHIRT_H}` }}
      >
        {/* Coloured shirt overlay — blends on top of body SVG */}
        <div
          className="absolute inset-0 rounded-sm mix-blend-multiply opacity-40"
          style={{ background: shirtColor }}
        />

        <Image
          src={bodyPath}
          alt={`Body style ${bodyStyle}`}
          fill
          className="object-contain"
          unoptimized   // SVGs don't need Next.js optimisation
          onError={e => {
            // Fall back to placeholder body if SVG missing
            ;(e.target as HTMLImageElement).src = '/bodies/placeholder.svg'
          }}
        />
      </div>

      {/* Head — positioned above body top, centred, 1.4× bobblehead scale */}
      <div
        className="absolute -top-[30%] left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-2 border-white shadow-md"
        style={{ width: headPx, height: headPx }}
      >
        <Image
          src={headUrl ?? HEAD_PLACEHOLDER}
          alt="Avatar head"
          fill
          className="object-cover"
        />
      </div>

      {/* Scribble count badge */}
      {scribbleCount !== undefined && (
        <div className="absolute -bottom-1 -right-1 bg-ink-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
          {scribbleCount}
        </div>
      )}
    </div>
  )
}
