'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface AvatarDisplayProps {
  bodyStyle:       string
  shirtColor?:     string
  headFrontUrl?:   string | null
  headBackUrl?:    string | null
  showBack?:       boolean
  size?:           'sm' | 'md' | 'lg' | 'xl'
  className?:      string
  scribbleCount?:  number
}

const SIZES = {
  sm: { avatar: 48,  head: 16 },
  md: { avatar: 132, head: 44 },
  lg: { avatar: 220, head: 74 },
  xl: { avatar: 320, head: 108 },
}

const BODY_VARIANTS: Record<string, { shoulder: number; torso: number; sleeve: number; neck: number }> = {
  M1: { shoulder: 0.86, torso: 0.58, sleeve: 0.23, neck: 0.20 },
  M2: { shoulder: 0.92, torso: 0.62, sleeve: 0.25, neck: 0.22 },
  M3: { shoulder: 0.80, torso: 0.54, sleeve: 0.21, neck: 0.18 },
  F1: { shoulder: 0.78, torso: 0.52, sleeve: 0.20, neck: 0.18 },
  F2: { shoulder: 0.84, torso: 0.56, sleeve: 0.23, neck: 0.20 },
  F3: { shoulder: 0.82, torso: 0.55, sleeve: 0.20, neck: 0.17 },
}

const HEAD_PLACEHOLDER =
  `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#E8E5DE"/><circle cx="20" cy="17" r="8" fill="#D5D9E3"/><path d="M8 35c2.8-8 21.2-8 24 0" fill="#D5D9E3"/></svg>')}`

function isDark(hex: string) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 110
}

export default function AvatarDisplay({
  bodyStyle,
  shirtColor = '#F8F8F8',
  headFrontUrl,
  headBackUrl,
  showBack = false,
  size = 'lg',
  className,
  scribbleCount,
}: AvatarDisplayProps) {
  const { avatar: avatarPx, head: headPx } = SIZES[size]
  const variant = BODY_VARIANTS[bodyStyle] ?? BODY_VARIANTS.M1
  const headUrl = showBack ? (headBackUrl ?? headFrontUrl) : headFrontUrl
  const darkShirt = isDark(shirtColor)
  const stageHeight = Math.round(avatarPx * 1.06)
  const torsoTop = Math.round(avatarPx * 0.36)
  const torsoHeight = Math.round(avatarPx * 0.56)
  const torsoWidth = Math.round(avatarPx * variant.torso)
  const shoulderWidth = Math.round(avatarPx * variant.shoulder)
  const sleeveWidth = Math.round(avatarPx * variant.sleeve)

  return (
    <div
      className={cn('relative inline-flex items-start justify-center', className)}
      style={{ width: avatarPx, height: stageHeight }}
      aria-label="Upper body shirt avatar"
    >
      <div
        className="absolute left-1/2 rounded-full overflow-hidden border-2 border-white shadow-sm bg-[#e8e5de]"
        style={{
          top: 0,
          width: headPx,
          height: headPx,
          transform: 'translateX(-50%)',
        }}
      >
        <Image
          src={headUrl ?? HEAD_PLACEHOLDER}
          alt="Avatar head"
          fill
          sizes={`${headPx}px`}
          className={showBack ? 'object-cover opacity-70 blur-[0.4px]' : 'object-cover'}
        />
      </div>

      <div
        className="absolute left-1/2 rounded-t-[999px] bg-[#dfe3ec]"
        style={{
          top: headPx * 0.72,
          width: headPx * 0.52,
          height: avatarPx * variant.neck,
          transform: 'translateX(-50%)',
        }}
      />

      <div
        className="absolute left-1/2 rounded-[999px] border border-black/5"
        style={{
          top: torsoTop + avatarPx * 0.01,
          width: shoulderWidth,
          height: avatarPx * 0.16,
          transform: 'translateX(-50%)',
          background: shirtColor,
          boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.04)',
        }}
      />

      <div
        className="absolute rounded-[999px] border border-black/5"
        style={{
          top: torsoTop + avatarPx * 0.035,
          left: (avatarPx - shoulderWidth) / 2 - sleeveWidth * 0.05,
          width: sleeveWidth,
          height: avatarPx * 0.18,
          background: shirtColor,
          transform: 'rotate(-7deg)',
        }}
      />

      <div
        className="absolute rounded-[999px] border border-black/5"
        style={{
          top: torsoTop + avatarPx * 0.035,
          right: (avatarPx - shoulderWidth) / 2 - sleeveWidth * 0.05,
          width: sleeveWidth,
          height: avatarPx * 0.18,
          background: shirtColor,
          transform: 'rotate(7deg)',
        }}
      />

      <div
        className={cn(
          'absolute left-1/2 overflow-hidden border bg-white',
          darkShirt ? 'border-white/25' : 'border-black/10'
        )}
        style={{
          top: torsoTop,
          width: torsoWidth,
          height: torsoHeight,
          transform: 'translateX(-50%)',
          borderRadius: `${Math.max(12, avatarPx * 0.06)}px ${Math.max(12, avatarPx * 0.06)}px ${Math.max(18, avatarPx * 0.12)}px ${Math.max(18, avatarPx * 0.12)}px`,
          background: shirtColor,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 -18px 32px rgba(0,0,0,0.05)',
        }}
      >
        <div
          className={cn('absolute left-1/2 top-0 h-[24%] -translate-x-1/2 rounded-b-full border-x border-b', darkShirt ? 'border-white/25 bg-black/15' : 'border-black/10 bg-white/45')}
          style={{ width: '34%' }}
        />
        {showBack && (
          <div className={cn('absolute left-1/2 top-[10%] h-px w-[42%] -translate-x-1/2', darkShirt ? 'bg-white/20' : 'bg-black/10')} />
        )}
      </div>

      {scribbleCount !== undefined && (
        <div className="absolute -bottom-1 -right-1 min-w-[20px] rounded-full bg-ink-900 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
          {scribbleCount}
        </div>
      )}
    </div>
  )
}
