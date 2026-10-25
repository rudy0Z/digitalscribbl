import { cn } from '@/lib/utils/cn'
import TableShirt from './TableShirt'
import TapeStrip from './TapeStrip'
import type { TableMark } from './types'

export interface ClotheslineShirt {
  id: string
  name: string
  markCount: number
  marks: TableMark[]
  tilt: number
}

interface ClotheslineStripProps {
  items: ClotheslineShirt[]
  className?: string
}

/** Peg positions follow the rope's sag — hand-tuned, not computed. */
const SAG_Y = [0, 14, 22, 24, 22, 14, 0]

function Peg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 34" className={cn('w-3.5 h-9 absolute -top-5 left-1/2 -ml-[7px] z-10', className)} aria-hidden>
      <rect x="1" y="0" width="5" height="30" rx="2" fill="#D9B98A" stroke="#191410" strokeWidth="1" />
      <rect x="8" y="0" width="5" height="30" rx="2" fill="#D9B98A" stroke="#191410" strokeWidth="1" />
      <rect x="2.5" y="9" width="9" height="2.5" rx="1" fill="#A07C48" />
    </svg>
  )
}

/**
 * The Clothesline — the batch directory (round-2 artwork, doc 26 §3).
 * A plaster wall, a sagging rope with a cast shadow, shirts swaying on
 * wooden pegs, names on taped paper tags.
 */
export default function ClotheslineStrip({ items, className }: ClotheslineStripProps) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundColor: '#EFE7D5' }}
    >
      {/* wall grain + top shadow */}
      <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20width=\'180\'%20height=\'180\'%3E%3Cfilter%20id=\'n\'%3E%3CfeTurbulence%20type=\'fractalNoise\'%20baseFrequency=\'0.9\'%20numOctaves=\'2\'%20stitchTiles=\'stitch\'/%3E%3CfeColorMatrix%20type=\'matrix\'%20values=\'0%200%200%200%200.10%200%200%200%200%200.08%200%200%200%200%200.05%200%200%200%200.35%200\'/%3E%3C/filter%3E%3Crect%20width=\'180\'%20height=\'180\'%20filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      <div aria-hidden className="absolute inset-x-0 top-0 h-14" style={{ background: 'linear-gradient(180deg, rgba(25,20,16,0.10), rgba(25,20,16,0))' }} />

      {/* rope + its cast shadow on the wall */}
      <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-[60px]" aria-hidden>
        <path d="M0 9 C 250 47, 750 47, 1000 9" fill="none" stroke="rgba(25,20,16,0.18)" strokeWidth="5" strokeLinecap="round" transform="translate(3 4)" />
        <path d="M0 6 C 250 44, 750 44, 1000 6" fill="none" stroke="#7A5C3D" strokeWidth="3.5" strokeLinecap="round" />
      </svg>

      <ul className="relative flex gap-7 sm:gap-12 overflow-x-auto px-7 sm:px-14 pt-12 pb-8">
        {items.map((item, i) => {
          const sag = SAG_Y[i % SAG_Y.length]
          return (
            <li
              key={item.id}
              className="relative shrink-0 w-[136px] sm:w-[156px]"
              style={{ transform: `translateY(${sag}px) rotate(${item.tilt}deg)` }}
            >
              <Peg />
              {/* hanging loop */}
              <span aria-hidden className="absolute top-0 left-1/2 w-px h-5 bg-[#6E5136]" />
              <div className="pt-5" style={{ animation: `ct-sway ${5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite alternate` }}>
                <TableShirt marks={item.marks} />
              </div>
              {/* paper name tag taped below */}
              <div className="mt-4 mx-auto w-fit relative">
                <TapeStrip tone="clear" width={40} className="absolute -top-2 left-1/2 -ml-[20px]" />
                <div
                  className="bg-craft-paper ring-1 ring-[rgba(25,20,16,0.1)] shadow-cutout-soft px-2.5 py-1 text-center"
                  style={{ borderRadius: '3px 6px 4px 7px / 6px 3px 7px 4px', transform: `rotate(${item.tilt * 0.5}deg)` }}
                >
                  <p className="font-tmono text-[10px] tracking-[0.14em] uppercase text-craft-ink">{item.name}</p>
                  <p className="font-tmono text-[9px] tracking-[0.12em] uppercase text-craft-ink-faint mt-0.5">
                    {item.markCount} marks
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
