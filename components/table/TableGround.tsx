import { useId } from 'react'
import { cn } from '@/lib/utils/cn'
import TapeStrip from './TapeStrip'
import { PAPER_GRAIN } from './grain'

interface TableGroundProps {
  className?: string
  /** faint drafting grid on the paper */
  grid?: boolean
  /** ruler margin strip down the left edge */
  ruler?: boolean
  /** coffee ring, shavings, corner tape, margin doodles */
  dressing?: boolean
  children?: React.ReactNode
}

/**
 * The butcher-paper tabletop — round-2 artwork (doc 26 §1).
 * Wood table edge above and below, a paper roll with real fiber grain,
 * drafting grid, ruler margin, taped corners, a coffee stain, eraser
 * shavings and hand-scribbled margin doodles that are actually visible.
 */
export default function TableGround({
  className,
  grid = true,
  ruler = true,
  dressing = true,
  children,
}: TableGroundProps) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* ── the wooden table showing above and below the paper roll ── */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, #6B4F33 0 3px, #7A5C3D 3px 7px, #6E5136 7px 12px, #82644234 12px 13px), linear-gradient(180deg, #7A5C3D, #5E452C)',
          backgroundBlendMode: 'multiply',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[26px]"
        style={{
          background: 'linear-gradient(180deg, #8A6B47 0, #6B4F33 70%, #59412A 100%)',
          boxShadow: 'inset 0 -2px 0 rgba(25,20,16,0.35)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[26px]"
        style={{
          background: 'linear-gradient(0deg, #8A6B47 0, #6B4F33 70%, #59412A 100%)',
          boxShadow: 'inset 0 2px 0 rgba(25,20,16,0.35)',
        }}
      />

      {/* ── the butcher-paper roll ── */}
      <div
        className="absolute inset-x-0 top-[22px] bottom-[22px]"
        style={{ backgroundColor: '#F5F0E3' }}
      >
        {/* fiber grain */}
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: PAPER_GRAIN }} />

        {/* drafting grid, kept quiet */}
        {grid ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(25,20,16,0.038) 1px, transparent 1px), linear-gradient(90deg, rgba(25,20,16,0.038) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        ) : null}

        {/* paper lighting: lit from top-left, soft vignette bottom-right */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(130% 100% at 22% 0%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 52%), radial-gradient(150% 120% at 85% 115%, rgba(25,20,16,0.10) 0%, rgba(25,20,16,0) 46%)',
          }}
        />

        {/* paper edges — the roll casts a shadow onto the wood */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[10px]"
          style={{ background: 'linear-gradient(180deg, rgba(25,20,16,0.16), rgba(25,20,16,0))' }}
        />

        {/* ruler margin with numbers */}
        {ruler ? (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 hidden sm:block w-9 border-r border-[rgba(25,20,16,0.10)]"
            style={{
              backgroundColor: 'rgba(233, 226, 209, 0.6)',
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(25,20,16,0.28) 0 1.5px, transparent 1.5px 24px), repeating-linear-gradient(180deg, rgba(25,20,16,0.16) 0 1px, transparent 1px 6px)',
              backgroundSize: '16px 100%, 8px 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right top, right top',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <span
                key={n}
                className="absolute right-3 font-tmono text-[8px] tracking-[0.1em] text-craft-ink-faint"
                style={{ top: `${n * 96 - 8}px` }}
              >
                {n * 4}
              </span>
            ))}
            <span
              className="absolute right-1 top-4 font-tmono text-[8px] tracking-[0.18em] text-craft-ink-faint opacity-80"
              style={{ writingMode: 'vertical-rl' }}
            >
              SCRIBBL · CLASS OF 2026 · ROOM 204
            </span>
          </div>
        ) : null}

        {/* ── dressing ── */}
        {dressing ? (
          <>
            {/* corner tape */}
            <TapeStrip tone="masking" rotation={-44} width={116} className="absolute -left-5 -top-4 z-20" />
            <TapeStrip tone="masking" rotation={44} width={116} className="absolute -right-5 -top-4 z-20" />
            <TapeStrip tone="clear" rotation={62} width={92} className="absolute -right-4 bottom-10 z-20" />

            {/* coffee stain — irregular ring via displacement */}
            <svg
              aria-hidden
              viewBox="0 0 140 140"
              className="absolute right-[7%] bottom-[8%] w-28 rotate-12 opacity-[0.16]"
            >
              <defs>
                <filter id={`${uid}-stain`} x="-30%" y="-30%" width="160%" height="160%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="t" />
                  <feDisplacementMap in="SourceGraphic" in2="t" scale="9" />
                </filter>
              </defs>
              <g filter={`url(#${uid}-stain)`} fill="none" stroke="#6E5136">
                <circle cx="70" cy="70" r="48" strokeWidth="8" opacity="0.7" />
                <circle cx="70" cy="70" r="54" strokeWidth="2.5" opacity="0.5" />
                <path d="M62 30 C74 26 88 30 96 38" strokeWidth="4" opacity="0.4" />
              </g>
            </svg>

            {/* eraser shavings */}
            <span aria-hidden className="absolute left-[16%] bottom-[12%] w-3 h-1.5 rotate-[24deg] rounded-[2px] bg-[#C9C2B2] shadow-sm" />
            <span aria-hidden className="absolute left-[19%] bottom-[10.5%] w-2.5 h-1 rotate-[-18deg] rounded-[2px] bg-[#D4CDBD]" />
            <span aria-hidden className="absolute left-[14%] bottom-[14%] w-2 h-1 rotate-[60deg] rounded-[2px] bg-[#BFB8A6]" />

            {/* margin doodles — visible, hand-placed */}
            <img
              src="/scribbl/stickers/paper-plane.svg"
              alt=""
              aria-hidden
              className="absolute left-[7%] top-[14%] w-16 -rotate-12 opacity-[0.17] pointer-events-none"
            />
            <img
              src="/scribbl/stickers/sparkle.svg"
              alt=""
              aria-hidden
              className="absolute right-[5%] top-[9%] w-11 rotate-6 opacity-[0.15] pointer-events-none"
            />
            <img
              src="/scribbl/stickers/star.svg"
              alt=""
              aria-hidden
              className="absolute right-[13%] bottom-[24%] w-12 rotate-12 opacity-[0.15] pointer-events-none"
            />
            <img
              src="/scribbl/stickers/arrow.svg"
              alt=""
              aria-hidden
              className="absolute left-[4.5%] bottom-[26%] w-20 rotate-3 opacity-[0.17] pointer-events-none"
            />
            <span
              aria-hidden
              className="absolute right-[8%] top-[16%] font-marker text-[15px] text-craft-ink-soft opacity-[0.28] -rotate-6 pointer-events-none"
            >
              don&apos;t forget ✶
            </span>
            <span
              aria-hidden
              className="absolute left-[10%] bottom-[36%] font-marker text-[13px] text-craft-ink-soft opacity-[0.26] rotate-3 pointer-events-none"
            >
              sign here →
            </span>
          </>
        ) : null}
      </div>

      {/* content sits on the paper */}
      <div className="relative pt-[22px] pb-[22px]">{children}</div>
    </div>
  )
}
