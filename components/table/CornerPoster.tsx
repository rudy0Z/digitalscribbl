'use client'

import { cn } from '@/lib/utils/cn'
import TableShirt from './TableShirt'
import StickerCutout from './StickerCutout'
import TapeStrip from './TapeStrip'
import type { FieldKey, TableMark } from './types'
import { FIELD_HEX, FIELD_IS_DARK } from './types'
import { FIELD_GRAIN } from './grain'

const FIELDS: FieldKey[] = ['marigold', 'cobalt', 'forest', 'oxblood']

export interface MarginNote {
  id: string
  text: string
  tone: string
  rotation: number
}

interface CornerPosterProps {
  name: string
  meta: string
  markCount: number
  friendCount: number
  lastMarkLine: string
  field: FieldKey
  shirtMarks: TableMark[]
  notes: MarginNote[]
  onSign?: () => void
  onShare?: () => void
  /** demo-only: let the viewer flip the house field */
  onFieldChange?: (field: FieldKey) => void
  className?: string
}

/**
 * My Corner — the personal poster (round-2 artwork, doc 26 §3).
 * The house field owns the screen with real grain; the name is set at
 * poster scale; a giant ghost numeral sits behind the die-cut shirt;
 * margin notes overlap the shirt like notes pinned to a board.
 */
export default function CornerPoster({
  name,
  meta,
  markCount,
  friendCount,
  lastMarkLine,
  field,
  shirtMarks,
  notes,
  onSign,
  onShare,
  onFieldChange,
  className,
}: CornerPosterProps) {
  const dark = FIELD_IS_DARK[field]
  const inkStyle = dark ? { color: '#FAF7F0' } : { color: '#191410' }
  const softInkStyle = dark ? { color: 'rgba(250,247,240,0.72)' } : { color: '#4A3A20' }

  return (
    <section
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundColor: FIELD_HEX[field] }}
    >
      {/* field grain + vignette */}
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: FIELD_GRAIN }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 30% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 50%), radial-gradient(140% 110% at 80% 118%, rgba(25,20,16,0.16) 0%, rgba(25,20,16,0) 48%)',
        }}
      />

      {/* ghost class numeral behind everything */}
      <span
        aria-hidden
        className="absolute -right-6 top-16 font-tdisplay font-extrabold leading-none select-none pointer-events-none hidden sm:block"
        style={{
          fontSize: 'clamp(160px, 24vw, 320px)',
          color: 'transparent',
          WebkitTextStroke: dark ? '2px rgba(250,247,240,0.16)' : '2px rgba(25,20,16,0.14)',
        }}
      >
        26
      </span>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* quiet top bar */}
        <div className="flex items-center justify-between gap-4" style={inkStyle}>
          <span className="font-tdisplay font-bold text-xl tracking-[0.06em] uppercase">Scribbl</span>
          <span className="font-tmono text-[10px] tracking-[0.16em] uppercase opacity-75">
            CSE · Class of 2026
          </span>
          <span className="flex items-center gap-1.5 font-tmono text-[10px] tracking-[0.14em] uppercase">
            <span className="w-2 h-2 rounded-full bg-craft-live inline-block animate-pulse" />
            2 here now
          </span>
        </div>

        {/* meta + poster-scale name */}
        <div className="mt-10 sm:mt-14" style={inkStyle}>
          <div className="w-12 h-[3px] bg-current opacity-70 mb-4" aria-hidden />
          <p className="font-tmono text-[12px] tracking-[0.22em] uppercase" style={softInkStyle}>
            {meta}
          </p>
          <h2
            className="font-tdisplay font-extrabold uppercase mt-1"
            style={{ fontSize: 'clamp(52px, 10vw, 118px)', lineHeight: 0.9, letterSpacing: '0.01em' }}
          >
            {name}
          </h2>
          <p className="font-tmono text-[11px] tracking-[0.12em] uppercase mt-4" style={softInkStyle}>
            {markCount} marks · {friendCount} friends · {lastMarkLine}
          </p>
        </div>

        {/* shirt + overlapping margin notes */}
        <div className="relative mt-10 sm:mt-12 flex justify-center">
          {/* desktop: notes overlap the shirt edges */}
          <div className="hidden md:block absolute left-1/2 -ml-[430px] top-8 w-52 z-10">
            {notes[0] ? (
              <div className="relative" style={{ transform: `rotate(${notes[0].rotation - 3}deg)` }}>
                <TapeStrip tone="clear" width={56} className="absolute -top-2.5 left-1/2 -ml-[28px]" />
                <div
                  className="bg-craft-paper ring-1 ring-[rgba(25,20,16,0.12)] shadow-cutout px-3.5 py-3 font-thand text-[17px] leading-tight text-craft-ink"
                  style={{ borderRadius: '4px 7px 3px 8px / 7px 4px 8px 3px' }}
                >
                  {notes[0].text}
                </div>
              </div>
            ) : null}
          </div>
          <div className="hidden md:block absolute left-1/2 ml-[240px] bottom-6 w-48 z-10">
            {notes[1] ? (
              <div className="relative" style={{ transform: `rotate(${notes[1].rotation + 2}deg)` }}>
                <TapeStrip tone="clear" width={56} className="absolute -top-2.5 left-1/2 -ml-[28px]" />
                <div
                  className="bg-craft-paper ring-1 ring-[rgba(25,20,16,0.12)] shadow-cutout px-3.5 py-3 font-thand text-[16px] leading-tight text-craft-ink"
                  style={{ borderRadius: '4px 7px 3px 8px / 7px 4px 8px 3px' }}
                >
                  {notes[1].text}
                </div>
              </div>
            ) : null}
          </div>

          <StickerCutout radius="blob" padding={9} rotation={-1.5} className="bg-craft-paper w-full max-w-[340px] sm:max-w-[400px]">
            <TableShirt marks={shirtMarks} />
          </StickerCutout>

          {/* mobile: notes stack under the shirt */}
          <div className="md:hidden absolute -bottom-2 inset-x-0 flex flex-col items-center gap-3 translate-y-full pt-4 pb-2">
            {notes.map(n => (
              <div key={n.id} className="relative w-56" style={{ transform: `rotate(${n.rotation}deg)` }}>
                <TapeStrip tone="clear" width={52} className="absolute -top-2.5 left-1/2 -ml-[26px]" />
                <div
                  className="bg-craft-paper ring-1 ring-[rgba(25,20,16,0.1)] shadow-cutout-soft px-3 py-2.5 font-thand text-[15px] leading-tight text-craft-ink"
                  style={{ borderRadius: '4px 7px 3px 8px / 7px 4px 8px 3px' }}
                >
                  {n.text}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* spacer for the mobile notes that hang below the shirt */}
        <div className="md:hidden h-40" aria-hidden />

        {/* CTAs */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSign}
            className="h-12 px-7 rounded-full bg-craft-ink text-craft-paper font-tdisplay font-semibold text-[15px] tracking-[0.08em] uppercase transition-transform hover:-translate-y-0.5"
            style={{ boxShadow: '4px 4px 0 rgba(25,20,16,0.30)' }}
          >
            Sign this shirt
          </button>
          <button
            type="button"
            onClick={onShare}
            className="h-12 px-7 rounded-full border-[1.5px] font-tdisplay font-semibold text-[15px] tracking-[0.08em] uppercase transition-colors bg-craft-paper/0"
            style={
              dark
                ? { borderColor: '#FAF7F0', color: '#FAF7F0' }
                : { borderColor: '#191410', color: '#191410' }
            }
          >
            Share link
          </button>
        </div>

        {/* demo-only field picker */}
        {onFieldChange ? (
          <div className="mt-9 flex items-center justify-center gap-2.5">
            {FIELDS.map(f => (
              <button
                key={f}
                type="button"
                title={`field: ${f}`}
                aria-label={`field: ${f}`}
                onClick={() => onFieldChange(f)}
                className={cn(
                  'w-8 h-8 rounded-full ring-1 ring-[rgba(25,20,16,0.3)] transition-transform',
                  f === field ? 'scale-115 ring-2 ring-offset-2 ring-offset-transparent' : 'hover:scale-110',
                )}
                style={{ backgroundColor: FIELD_HEX[f] }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
