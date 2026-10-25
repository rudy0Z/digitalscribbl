'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils/cn'
import { getShirtTemplate } from '@/lib/utils/shirtTemplate'
import type { TableMark } from './types'
import StickerCutout from './StickerCutout'
import TapeStrip from './TapeStrip'

interface TableShirtProps {
  panel?: 'front' | 'back'
  marks?: TableMark[]
  className?: string
  style?: React.CSSProperties
  /** marks that are not taped down yet float with a softer shadow */
  looseIds?: Set<string>
}

const INK = '#191410'
const COTTON_HI = '#FFFFFF'
const COTTON_LO = '#F1ECDF'
const SHADOW = '#D9D2C0'
const EDGE = '#E2DCCB'

/**
 * The flat-lay shirt — a real garment lying on the table (round-2 artwork).
 * Crew-neck tee: punched-through neck opening, ribbed collar, gradient
 * cotton, blurred fold shadows, double-needle stitching, fiber grain.
 *
 * The drawable region is still the canonical `shirtTemplate.ts` polygon, so
 * every mark coordinate matches what the API validates and what the avatar
 * renderer masks — only the artwork around it changed.
 */
export default function TableShirt({
  panel = 'front',
  marks = [],
  className,
  style,
  looseIds,
}: TableShirtProps) {
  const template = getShirtTemplate(panel)
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')

  // garment silhouette v3 — straight-fit crew tee with honest proportions
  // (body length ≈ 1.4× width; hem raised so the shirt stops reading as a dress).
  // The canonical drawable polygon is reused but scaled about (200,150) to sit
  // inside the shorter garment — mark coordinates stay in the same 400×600 space.
  const BODY_PATH = `
    M150 64
    C168 42 232 42 250 64
    L342 96
    C366 128 386 168 396 216
    L392 234
    L322 254
    L356 505
    C280 522 120 522 44 505
    L78 254
    L8 234
    L4 216
    C14 168 34 128 58 96
    Z`

  // neck opening — rendered as an interior shadow + ribbed band (no punch-through;
  // the see-through hole read as a strange bowl in round 2)
  const NECK_OPENING = `
    M150 64
    C168 42 232 42 250 64
    C232 100 168 100 150 64
    Z`

  const DRAWABLE_TRANSFORM = 'translate(200,150) scale(1.04,0.836) translate(-200,-150)'

  return (
    <div
      className={cn('relative', className)}
      style={{ filter: 'drop-shadow(0 16px 22px rgba(25, 20, 16, 0.20)) drop-shadow(0 3px 6px rgba(25, 20, 16, 0.10))', ...style }}
    >
      <svg viewBox="0 0 400 600" className="block w-full h-auto" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-cotton`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COTTON_HI} />
            <stop offset="0.55" stopColor="#FBF8F0" />
            <stop offset="1" stopColor={COTTON_LO} />
          </linearGradient>
          <linearGradient id={`${uid}-inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8F8471" />
            <stop offset="1" stopColor="#C9C1AD" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={`${uid}-soft2`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.05 0" />
          </filter>
          <clipPath id={`${uid}-body`}>
            <path d={BODY_PATH} />
          </clipPath>
        </defs>

        {/* garment body */}
        <path
          d={BODY_PATH}
          fill={`url(#${uid}-cotton)`}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* fiber grain, clipped to the garment */}
        <g clipPath={`url(#${uid}-body)`}>
          <rect width="400" height="600" filter={`url(#${uid}-grain)`} />
        </g>

        {/* soft shading + folds, all clipped to the garment */}
        <g clipPath={`url(#${uid}-body)`}>
          <g filter={`url(#${uid}-soft)`} opacity="0.55">
            <path d="M64 260 C56 330 56 420 62 490" stroke={SHADOW} strokeWidth="18" fill="none" />
            <path d="M336 260 C344 330 344 420 338 490" stroke={SHADOW} strokeWidth="18" fill="none" />
            <path d="M70 470 C140 490 260 490 330 470" stroke={SHADOW} strokeWidth="12" fill="none" />
            <path d="M92 268 C104 286 110 310 112 332" stroke={SHADOW} strokeWidth="9" fill="none" />
            <path d="M308 268 C296 286 290 310 288 332" stroke={SHADOW} strokeWidth="9" fill="none" />
          </g>

          <g filter={`url(#${uid}-soft2)`} opacity="0.4" stroke={EDGE} strokeWidth="2.5" fill="none">
            <path d="M148 280 C142 350 145 420 152 480" />
            <path d="M254 280 C260 350 257 420 250 480" />
            <path d="M118 290 C130 312 136 344 138 372" />
            <path d="M282 292 C270 314 264 346 262 374" />
            <path d="M36 150 C48 172 54 196 56 216" />
            <path d="M364 150 C352 172 346 196 344 216" />
          </g>

          <g filter={`url(#${uid}-soft)`} opacity="0.5">
            <path d="M200 150 L200 486" stroke="#FFFFFF" strokeWidth="34" fill="none" />
          </g>
        </g>

        {/* neck opening: interior shadow crescent + ribbed band */}
        {panel === 'front' ? (
          <g>
            <path d={NECK_OPENING} fill={`url(#${uid}-inner)`} stroke="none" />
            {/* back-collar inner line */}
            <path d="M152 63 C168 50 232 50 248 63" stroke={EDGE} strokeWidth="1.4" fill="none" opacity="0.7" />
            {/* rib band along the front neckline: ink outline, paper band, rib dashes */}
            <path d="M149 67 C168 105 232 105 251 67" fill="none" stroke={INK} strokeWidth="12" />
            <path d="M149 67 C168 105 232 105 251 67" fill="none" stroke="#EFEBDD" strokeWidth="9" />
            <path d="M150 70 C168 106 232 106 250 70" fill="none" stroke={EDGE} strokeWidth="1.2" strokeDasharray="1.5 2.2" />
          </g>
        ) : (
          <path d="M158 70 C176 86 224 86 242 70" stroke={EDGE} strokeWidth="2" fill="none" />
        )}

        {/* double-needle stitching */}
        <g stroke={EDGE} strokeWidth="1.6" fill="none" strokeDasharray="5 4">
          <path d="M52 490 C130 507 270 507 348 490" />
          <path d="M52 482 C130 499 270 499 348 482" />
          <path d="M14 222 L84 242" />
          <path d="M386 222 L316 242" />
        </g>

        {/* shoulder seams */}
        <g stroke={EDGE} strokeWidth="1.8" fill="none" strokeDasharray="6 4">
          <path d="M152 66 L60 97" />
          <path d="M248 66 L340 97" />
        </g>
      </svg>

      {/* marks layer, clipped to the (proportion-mapped) canonical drawable region */}
      <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full">
        <defs>
          <clipPath id={`${uid}-drawable`}>
            <path d={template.drawablePath} transform={DRAWABLE_TRANSFORM} />
          </clipPath>
        </defs>
        <foreignObject x="0" y="0" width="400" height="600" clipPath={`url(#${uid}-drawable)`}>
          <div style={{ width: 400, height: 600 }} className="relative">
            {marks.map(mark => (
              <div
                key={mark.id}
                className="absolute"
                style={{
                  left: mark.x,
                  top: mark.y,
                  width: mark.width,
                  transform: `rotate(${mark.rotation}deg)`,
                }}
              >
                {mark.kind === 'sticker' ? (
                  <StickerCutout
                    padding={4}
                    radius="blob"
                    className={looseIds?.has(mark.id) ? 'shadow-cutout-soft' : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/scribbl/stickers/${mark.stickerId ?? 'star'}.svg`}
                      alt=""
                      className="block w-full h-auto"
                      draggable={false}
                    />
                  </StickerCutout>
                ) : mark.kind === 'note' ? (
                  <div className="relative">
                    <div
                      className="font-thand leading-tight px-2 py-1.5 text-[15px] shadow-cutout-soft ring-1 ring-[rgba(25,20,16,0.07)]"
                      style={{
                        backgroundColor: mark.tone ?? '#FFF3B8',
                        color: mark.color ?? INK,
                        borderRadius: '3px 6px 4px 7px / 6px 3px 7px 4px',
                      }}
                    >
                      {mark.text}
                    </div>
                    {!looseIds?.has(mark.id) ? (
                      <TapeStrip tone="clear" width={44} className="absolute -top-2 left-1/2 -ml-[22px]" />
                    ) : null}
                  </div>
                ) : (
                  <div
                    className="font-thand leading-none whitespace-nowrap"
                    style={{
                      color: mark.color ?? INK,
                      fontSize: Math.max(18, Math.round(mark.width * 0.34)),
                      fontWeight: 600,
                    }}
                  >
                    {mark.text}
                  </div>
                )}

                {typeof mark.number === 'number' && !looseIds?.has(mark.id) ? (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full bg-craft-ink text-craft-paper font-tmono text-[9px] tracking-[0.08em] shadow-cutout-soft">
                    {mark.number}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
