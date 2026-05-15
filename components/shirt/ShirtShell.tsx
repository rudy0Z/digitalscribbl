'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import type { Panel } from '@/lib/supabase/types'

interface ShirtShellProps {
  shirtColor: string
  headUrl?: string | null
  panel: Panel
  className?: string
  children?: React.ReactNode
  showHead?: boolean
  surfaceClassName?: string
}

const HEAD_PLACEHOLDER =
  `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#e8e5de"/><circle cx="40" cy="33" r="15" fill="#cfd5df"/><path d="M16 74c5-20 43-20 48 0" fill="#cfd5df"/></svg>')}`

function isDark(hex: string) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 120
}

export default function ShirtShell({
  shirtColor,
  headUrl,
  panel,
  className,
  children,
  showHead = true,
  surfaceClassName,
}: ShirtShellProps) {
  const dark = isDark(shirtColor)
  const isBack = panel === 'back'
  const isSleeves = panel === 'sleeves'

  return (
    <div className={cn('relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-black/10 bg-[#ebe4d8]', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.82),rgba(255,255,255,0)_34%),linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0))]" />

      {showHead && (
        <div className="absolute left-1/2 top-[2.5%] z-30 w-[25%] -translate-x-1/2 overflow-hidden rounded-full border-[5px] border-[#f8f5ee] bg-[#e3e5eb] shadow-sm">
          <div className="relative aspect-square w-full">
            <Image
              src={headUrl ?? HEAD_PLACEHOLDER}
              alt="Avatar head"
              fill
              sizes="180px"
              className={cn('object-cover', isBack && 'opacity-70 blur-[0.4px]')}
            />
          </div>
        </div>
      )}

      <div
        className="absolute left-1/2 top-[20%] z-10 h-[18%] w-[86%] -translate-x-1/2 rounded-[999px] border border-black/5"
        style={{
          background: shirtColor,
          boxShadow: 'inset 0 -18px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      />
      <div
        className={cn('absolute left-[4%] top-[26%] z-10 h-[17%] w-[30%] rounded-[999px] border border-black/5', isSleeves && 'ring-2 ring-ink-900/15')}
        style={{
          background: shirtColor,
          transform: 'rotate(-9deg)',
          boxShadow: 'inset 0 -18px 32px rgba(0,0,0,0.05)',
        }}
      />
      <div
        className={cn('absolute right-[4%] top-[26%] z-10 h-[17%] w-[30%] rounded-[999px] border border-black/5', isSleeves && 'ring-2 ring-ink-900/15')}
        style={{
          background: shirtColor,
          transform: 'rotate(9deg)',
          boxShadow: 'inset 0 -18px 32px rgba(0,0,0,0.05)',
        }}
      />

      <div
        className={cn(
          'absolute left-[18%] top-[25%] z-20 h-[70%] w-[64%] overflow-hidden border',
          dark ? 'border-white/25' : 'border-black/10',
          isSleeves && 'opacity-70',
          surfaceClassName,
        )}
        style={{
          background: shirtColor,
          borderRadius: '22px 22px 64px 64px',
          clipPath: 'polygon(10% 0%, 37% 0%, 42% 10%, 50% 13%, 58% 10%, 63% 0%, 90% 0%, 96% 14%, 100% 100%, 0% 100%, 4% 14%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24), inset 0 -42px 58px rgba(0,0,0,0.06)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_4%,rgba(255,255,255,0.42),rgba(255,255,255,0)_19%),linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0)_24%,rgba(0,0,0,0.03)_70%,rgba(255,255,255,0.16))]" />
        <div className={cn('absolute left-1/2 top-0 z-40 h-[18%] w-[36%] -translate-x-1/2 rounded-b-full border-x border-b', dark ? 'border-white/25 bg-black/12' : 'border-black/10 bg-white/45')} />
        {isBack && <div className={cn('absolute left-1/2 top-[8%] z-40 h-px w-[44%] -translate-x-1/2', dark ? 'bg-white/25' : 'bg-black/12')} />}
        <div className="absolute inset-0 z-20">{children}</div>
      </div>

      {isSleeves && (
        <div className="absolute inset-x-6 bottom-4 z-30 rounded-full border border-black/10 bg-white/72 px-3 py-2 text-center text-xs font-medium text-gray-600 shadow-sm backdrop-blur">
          Sleeve mode highlights the side areas, but saves on the same lightweight canvas.
        </div>
      )}
    </div>
  )
}
