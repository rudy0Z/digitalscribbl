'use client'

import { cn } from '@/lib/utils/cn'
import StickerCutout from './StickerCutout'

export interface StickerScrap {
  id: string
  label: string
}

export interface NoteScrap {
  id: string
  text: string
  tone: string
}

interface ScrapBoxProps {
  stickers: StickerScrap[]
  notes: NoteScrap[]
  /** currently "in hand" scrap id — tap a scrap, then tap the shirt */
  heldId: string | null
  onSelectSticker: (scrap: StickerScrap) => void
  onSelectNote: (scrap: NoteScrap) => void
  className?: string
}

/** deterministic pile rotations so SSR and client agree */
const STICKER_TILT = [-7, 4, -3, 8, -5, 2, 6, -8]
const NOTE_TILT = [-1.5, 1, -2]

/**
 * The scrap box — a kraft cardboard tray with the scraps piled in it
 * (round-2 artwork). Stickers lie tilted and overlapping; note scraps are
 * fanned. Tap a scrap to pick it up, tap the shirt to put it down.
 */
export default function ScrapBox({
  stickers,
  notes,
  heldId,
  onSelectSticker,
  onSelectNote,
  className,
}: ScrapBoxProps) {
  return (
    <div
      className={cn('relative p-3 pb-4', className)}
      style={{
        backgroundColor: '#DDBE8C',
        borderRadius: '10px 14px 9px 13px / 13px 9px 14px 10px',
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 8px rgba(25,20,16,0.14), 0 12px 24px rgba(25,20,16,0.16)',
        border: '1px solid rgba(25,20,16,0.25)',
      }}
    >
      {/* corrugated bottom edge */}
      <span
        aria-hidden
        className="absolute inset-x-2 bottom-1.5 h-[7px] rounded-[3px]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(25,20,16,0.22) 0 2px, rgba(255,255,255,0.28) 2px 4px)',
          border: '1px solid rgba(25,20,16,0.2)',
        }}
      />

      {/* taped-on handwritten label */}
      <div className="absolute -top-3 left-4 rotate-[-3deg]">
        <span className="font-marker text-[13px] text-craft-ink bg-craft-paper px-2 py-0.5 inline-block shadow-cutout-soft" style={{ borderRadius: '3px 6px 4px 7px' }}>
          scrap box
        </span>
      </div>

      {/* sticker pile */}
      <div className="mt-4 flex flex-wrap gap-x-1 gap-y-3 justify-center">
        {stickers.map((s, i) => {
          const held = s.id === heldId
          return (
            <button
              key={s.id}
              type="button"
              title={s.label}
              aria-pressed={held}
              onClick={() => onSelectSticker(s)}
              className={cn(
                'transition-transform duration-150',
                held ? 'scale-115 -translate-y-1.5 z-10' : 'hover:scale-110',
              )}
              style={{ transform: held ? undefined : `rotate(${STICKER_TILT[i % STICKER_TILT.length]}deg)` }}
            >
              <StickerCutout padding={3} radius="blob">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/scribbl/stickers/${s.id}.svg`}
                  alt={s.label}
                  className="block w-8 h-8"
                  draggable={false}
                />
              </StickerCutout>
            </button>
          )
        })}
      </div>

      {/* fanned note scraps */}
      <div className="mt-4 flex flex-col gap-2 px-1">
        {notes.map((n, i) => {
          const held = n.id === heldId
          return (
            <button
              key={n.id}
              type="button"
              aria-pressed={held}
              onClick={() => onSelectNote(n)}
              className={cn(
                'text-left font-thand text-[15px] leading-tight px-2 py-1.5 ring-1 ring-[rgba(25,20,16,0.10)] shadow-cutout-soft transition-transform duration-150',
                held ? 'scale-[1.04] z-10' : 'hover:scale-[1.02]',
              )}
              style={{
                backgroundColor: n.tone,
                borderRadius: '3px 6px 4px 7px / 6px 3px 7px 4px',
                transform: `rotate(${(held ? NOTE_TILT[i % 3] : NOTE_TILT[i % 3])}deg)`,
              }}
            >
              {n.text}
            </button>
          )
        })}
      </div>

      {heldId ? (
        <p className="mt-3 text-center font-tmono text-[9px] tracking-[0.16em] text-craft-ink-soft uppercase">
          now tap the shirt
        </p>
      ) : null}
    </div>
  )
}
