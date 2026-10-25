'use client'

import { cn } from '@/lib/utils/cn'
import { Undo2 } from 'lucide-react'
import { MARKER_INKS } from './types'

const NIBS = [
  { id: 'fine', dot: 5, label: 'Fineliner' },
  { id: 'chisel', dot: 9, label: 'Chisel' },
  { id: 'wide', dot: 14, label: 'Highlighter' },
] as const

interface InkTrayProps {
  selectedInk: string
  onSelectInk: (id: string) => void
  selectedNib: string
  onSelectNib: (id: string) => void
  onUndo: () => void
  canUndo: boolean
  onPublish: () => void
  onJustSign: () => void
  looseCount: number
  className?: string
}

/**
 * The instrument tray — round-2 artwork (doc 26). Real markers lying in a
 * kraft tray: capsule bodies with caps, the selected one lifted off the felt.
 * Quiet chrome rule still applies — the tray is an object, not a decoration.
 */
export default function InkTray({
  selectedInk,
  onSelectInk,
  selectedNib,
  onSelectNib,
  onUndo,
  canUndo,
  onPublish,
  onJustSign,
  looseCount,
  className,
}: InkTrayProps) {
  return (
    <div
      data-system="ink-tray"
      className={cn(
        'relative flex flex-wrap items-center gap-x-4 gap-y-3 px-4 sm:px-5 py-3.5',
        'bg-[#E4D5B4] ring-1 ring-[rgba(25,20,16,0.28)]',
        'shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(25,20,16,0.12),0_10px_22px_rgba(25,20,16,0.14)]',
        className,
      )}
      style={{ borderRadius: '10px 14px 9px 13px / 13px 9px 14px 10px' }}
    >
      {/* marker inks — physical capsules */}
      <div className="flex items-end gap-1.5" role="radiogroup" aria-label="Marker ink">
        {MARKER_INKS.map(ink => {
          const selected = ink.id === selectedInk
          return (
            <button
              key={ink.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={ink.id}
              onClick={() => onSelectInk(ink.id)}
              className={cn(
                'relative transition-transform duration-150',
                selected ? '-translate-y-2 drop-shadow-[0_6px_6px_rgba(25,20,16,0.3)]' : 'hover:-translate-y-1',
              )}
            >
              {/* marker body */}
              <span
                className="relative block w-[18px] h-[34px] rounded-[5px] ring-1 ring-[rgba(25,20,16,0.35)]"
                style={{
                  backgroundColor: ink.hex,
                  boxShadow: 'inset -3px 0 4px rgba(25,20,16,0.25), inset 2px 1px 2px rgba(255,255,255,0.35)',
                }}
              >
                {/* cap band */}
                <span className="absolute top-0 left-0 right-0 h-[11px] rounded-t-[5px] bg-[rgba(25,20,16,0.28)]" />
                {/* nib */}
                <span className="absolute -top-[5px] left-1/2 -ml-[3px] w-[6px] h-[5px] bg-[#EFE9DA] rounded-t-[3px] ring-1 ring-[rgba(25,20,16,0.3)]" />
              </span>
              {selected ? (
                <span className="absolute -bottom-1.5 left-1/2 -ml-[3px] w-[6px] h-[6px] rounded-full bg-craft-ink" />
              ) : null}
            </button>
          )
        })}
      </div>

      {/* nibs on a felt strip */}
      <div
        className="flex items-center gap-1 rounded-full bg-[rgba(25,20,16,0.08)] px-1.5 py-1"
        role="radiogroup"
        aria-label="Nib size"
      >
        {NIBS.map(nib => {
          const selected = nib.id === selectedNib
          return (
            <button
              key={nib.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={nib.label}
              onClick={() => onSelectNib(nib.id)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                selected ? 'bg-craft-paper ring-1 ring-craft-ink shadow-cutout-soft' : 'hover:bg-craft-paper/60',
              )}
            >
              <span className="rounded-full bg-craft-ink block" style={{ width: nib.dot, height: nib.dot }} />
            </button>
          )
        })}
      </div>

      <span aria-hidden className="hidden sm:block w-px self-stretch bg-[rgba(25,20,16,0.2)]" />

      {/* undo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo last loose mark"
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
          canUndo ? 'text-craft-ink hover:bg-craft-paper/70' : 'text-craft-ink/30',
        )}
      >
        <Undo2 size={17} strokeWidth={2} />
      </button>

      <span className="flex-1" />

      <span className="font-tmono text-[10px] tracking-[0.14em] text-craft-ink-soft uppercase">
        {looseCount > 0 ? `${looseCount} loose` : 'nothing loose'}
      </span>

      {/* CTAs — tracked caps pills with print-style offset shadow */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onJustSign}
          className="h-10 px-4 rounded-full border-[1.5px] border-craft-ink bg-craft-paper text-craft-ink font-tdisplay font-semibold text-[13px] tracking-[0.08em] uppercase hover:-translate-y-px transition-transform"
        >
          Just sign
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="h-10 px-5 rounded-full bg-craft-ink text-craft-paper font-tdisplay font-semibold text-[13px] tracking-[0.08em] uppercase transition-transform hover:-translate-y-0.5"
          style={{ boxShadow: '3px 3px 0 rgba(25,20,16,0.28)' }}
        >
          Tape it down
        </button>
      </div>
    </div>
  )
}
