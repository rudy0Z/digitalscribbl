'use client'

// Craft-table MVP demo, round-2 artwork (doc 26 §4). Mock data, mock cursors,
// client-only publish loop: tap a scrap → tap the shirt → TAPE IT DOWN.

import { useMemo, useRef, useState } from 'react'
import TableGround from '@/components/table/TableGround'
import TableShirt from '@/components/table/TableShirt'
import ScrapBox from '@/components/table/ScrapBox'
import InkTray from '@/components/table/InkTray'
import LiveCursors, { type CursorUser } from '@/components/table/LiveCursors'
import CornerPoster from '@/components/table/CornerPoster'
import ClotheslineStrip, { type ClotheslineShirt } from '@/components/table/ClotheslineStrip'
import StickerCutout from '@/components/table/StickerCutout'
import { PAPER_GRAIN } from '@/components/table/grain'
import {
  NOTE_TONES,
  MARKER_INKS,
  type FieldKey,
  type TableMark,
  rotationFor,
} from '@/components/table/types'

/* ── mock data ──────────────────────────────────────────────────────────── */

const SEED_MARKS: TableMark[] = [
  {
    id: 'seed-1',
    kind: 'note',
    text: 'call me when you are famous ✶',
    x: 96,
    y: 226,
    width: 116,
    rotation: -4,
    tone: NOTE_TONES[0],
    number: 1,
  },
  {
    id: 'seed-2',
    kind: 'sticker',
    stickerId: 'bear-doodle',
    x: 236,
    y: 300,
    width: 52,
    rotation: 5,
    number: 2,
  },
  {
    id: 'seed-3',
    kind: 'signature',
    text: '— Arjun',
    x: 150,
    y: 396,
    width: 96,
    rotation: -3,
    color: '#2D2923',
    number: 3,
  },
]

const STICKER_SCRAPS = [
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'fire', label: 'Fire' },
  { id: 'crown', label: 'Crown' },
  { id: 'paper-plane', label: 'Paper plane' },
  { id: 'smile', label: 'Smile' },
  { id: 'lightning', label: 'Lightning' },
  { id: 'flower', label: 'Flower' },
]

const NOTE_SCRAPS = [
  { id: 'note-1', text: 'hostel 7 forever', tone: NOTE_TONES[1] },
  { id: 'note-2', text: 'best of luck yaar ✶', tone: NOTE_TONES[2] },
  { id: 'note-3', text: 'send me the pics!', tone: NOTE_TONES[3] },
]

const CURSOR_USERS: CursorUser[] = [
  { id: 'c1', name: 'MEGHNA', color: '#E8453C', baseX: 0.42, baseY: 0.35, ampX: 0.16, ampY: 0.12, speed: 0.5, phase: 0 },
  { id: 'c2', name: 'ARJUN', color: '#2563EB', baseX: 0.6, baseY: 0.6, ampX: 0.14, ampY: 0.16, speed: 0.42, phase: 2.1 },
]

const LINE_SHIRTS: ClotheslineShirt[] = [
  { id: 'l1', name: 'Riya S.', markCount: 24, tilt: -2, marks: [
    { id: 'rl1', kind: 'signature', text: '— Dev', x: 140, y: 344, width: 84, rotation: -4 },
    { id: 'rl2', kind: 'sticker', stickerId: 'heart', x: 220, y: 250, width: 40, rotation: 6 },
  ] },
  { id: 'l2', name: 'Meghna K.', markCount: 41, tilt: 1.5, marks: [
    { id: 'rl3', kind: 'note', text: 'always the topper', x: 120, y: 282, width: 92, rotation: -5, tone: NOTE_TONES[2] },
    { id: 'rl8', kind: 'sticker', stickerId: 'star', x: 226, y: 358, width: 38, rotation: 4 },
  ] },
  { id: 'l3', name: 'Arjun M.', markCount: 12, tilt: -1, marks: [
    { id: 'rl4', kind: 'sticker', stickerId: 'fire', x: 190, y: 315, width: 44, rotation: -6 },
  ] },
  { id: 'l4', name: 'Kabir', markCount: 58, tilt: 2, marks: [
    { id: 'rl5', kind: 'signature', text: 'nerd <3', x: 160, y: 374, width: 70, rotation: 3 },
    { id: 'rl6', kind: 'sticker', stickerId: 'sparkle', x: 230, y: 232, width: 38, rotation: 4 },
  ] },
  { id: 'l5', name: 'Sana', markCount: 33, tilt: -2.5, marks: [
    { id: 'rl7', kind: 'note', text: 'lab partner 4ever', x: 110, y: 316, width: 96, rotation: 4, tone: NOTE_TONES[0] },
  ] },
  { id: 'l6', name: 'Aditya', markCount: 5, tilt: 1, marks: [
    { id: 'rl9', kind: 'signature', text: 'gg', x: 180, y: 330, width: 44, rotation: -3 },
  ] },
]

/* ── helpers ────────────────────────────────────────────────────────────── */

const DRAW_BOUNDS = { x: 66, y: 152, w: 268, h: 320 }

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

type HeldScrap =
  | { kind: 'sticker'; scrapId: string; stickerId: string }
  | { kind: 'note'; scrapId: string; text: string; tone: string }

const SIGN_SPOTS = [
  { x: 210, y: 382 },
  { x: 130, y: 320 },
  { x: 240, y: 210 },
  { x: 170, y: 420 },
]

/** Torn-paper edge between sections — the next material tears over the last. */
function TornDivider({ fill, flip }: { fill: string; flip?: boolean }) {
  return (
    <div aria-hidden className="relative h-6 -mt-6 z-10 pointer-events-none">
      <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ transform: flip ? 'scaleY(-1)' : undefined }}>
        <path
          d="M0 24 L0 10 L34 14 L82 6 L128 13 L190 5 L246 12 L310 7 L368 15 L430 8 L486 13 L552 5 L618 12 L676 7 L740 14 L806 6 L868 12 L932 8 L994 15 L1052 9 L1112 13 L1160 6 L1200 11 L1200 24 Z"
          fill={fill}
        />
      </svg>
    </div>
  )
}

/* ── the demo ───────────────────────────────────────────────────────────── */

export default function CraftTableDemo() {
  const [field, setField] = useState<FieldKey>('marigold')
  const [marks, setMarks] = useState<TableMark[]>(SEED_MARKS)
  const [looseIds, setLooseIds] = useState<Set<string>>(new Set())
  const [held, setHeld] = useState<HeldScrap | null>(null)
  const [selectedInk, setSelectedInk] = useState('black')
  const [selectedNib, setSelectedNib] = useState('fine')
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const shirtRef = useRef<HTMLDivElement | null>(null)
  const nextNumber = useRef(SEED_MARKS.length)

  const tapedCount = marks.filter(m => typeof m.number === 'number').length
  const looseCount = looseIds.size
  const inkHex = MARKER_INKS.find(i => i.id === selectedInk)?.hex ?? '#2D2923'

  const posterNotes = useMemo(
    () => [
      { id: 'pn1', text: 'be the first on the fabric ✶', tone: NOTE_TONES[0], rotation: -2 },
      { id: 'pn2', text: '23 days left to scribble', tone: NOTE_TONES[3], rotation: 1.5 },
    ],
    [],
  )

  const placeMark = (clientX: number, clientY: number) => {
    const rect = shirtRef.current?.getBoundingClientRect()
    if (!rect || !held) return
    const sx = ((clientX - rect.left) / rect.width) * 400
    const sy = ((clientY - rect.top) / rect.height) * 600

    const width = held.kind === 'sticker' ? 52 : held.kind === 'note' ? 112 : 110
    const mark: TableMark =
      held.kind === 'sticker'
        ? {
            id: `m-${Date.now()}`,
            kind: 'sticker',
            stickerId: held.stickerId,
            x: clamp(sx - 26, DRAW_BOUNDS.x, 334 - width),
            y: clamp(sy - 30, DRAW_BOUNDS.y, 468 - width),
            width,
            rotation: rotationFor(marks.length),
          }
        : held.kind === 'note'
          ? {
              id: `m-${Date.now()}`,
              kind: 'note',
              text: held.text,
              tone: held.tone,
              x: clamp(sx - 56, DRAW_BOUNDS.x, 334 - width),
              y: clamp(sy - 22, DRAW_BOUNDS.y, 464),
              width,
              rotation: rotationFor(marks.length),
            }
          : {
              id: `m-${Date.now()}`,
              kind: 'signature',
              text: '— You',
              color: inkHex,
              x: clamp(sx - 40, DRAW_BOUNDS.x, 334 - width),
              y: clamp(sy - 14, DRAW_BOUNDS.y, 464),
              width,
              rotation: rotationFor(marks.length),
            }

    setMarks(m => [...m, mark])
    setLooseIds(prev => new Set(prev).add(mark.id))
    setHeld(null)
    setPreview(null)
  }

  const justSign = () => {
    const spot = SIGN_SPOTS[looseCount % SIGN_SPOTS.length]
    const id = `m-${Date.now()}`
    setMarks(m => [
      ...m,
      {
        id,
        kind: 'signature',
        text: '— You',
        color: inkHex,
        x: spot.x,
        y: spot.y,
        width: 110,
        rotation: rotationFor(m.length),
      },
    ])
    setLooseIds(prev => new Set(prev).add(id))
  }

  const undo = () => {
    setMarks(m => {
      const lastLoose = [...m].reverse().find(mk => looseIds.has(mk.id))
      if (!lastLoose) return m
      setLooseIds(prev => {
        const next = new Set(prev)
        next.delete(lastLoose.id)
        return next
      })
      return m.filter(mk => mk.id !== lastLoose.id)
    })
  }

  const publish = () => {
    if (looseCount === 0) return
    setMarks(m =>
      m.map(mk => {
        if (!looseIds.has(mk.id)) return mk
        nextNumber.current += 1
        return { ...mk, number: nextNumber.current }
      }),
    )
    setLooseIds(new Set())
  }

  return (
    <main>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ct-land { 0% { scale: 1.25; opacity: 0.3 } 70% { scale: 0.95 } 100% { scale: 1; opacity: 1 } }
            .ct-land { animation: ct-land 0.42s cubic-bezier(0.2, 0.8, 0.3, 1.15) both }
            @keyframes ct-pop { 0% { scale: 1.7 } 100% { scale: 1 } }
            .ct-pop { animation: ct-pop 0.25s cubic-bezier(0.2, 0.8, 0.3, 1.2) 0.1s both }
            @keyframes ct-sway { from { transform: rotate(-0.7deg) } to { transform: rotate(0.7deg) } }
            @media (prefers-reduced-motion: reduce) { .ct-land, .ct-pop { animation: none } * { animation-duration: 0.01s !important } }
          `,
        }}
      />

      {/* ── masthead ───────────────────────────────────────── */}
      <header className="relative bg-craft-ink text-craft-paper overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: PAPER_GRAIN }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(110% 90% at 20% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
          <p className="font-tmono text-[10px] tracking-[0.2em] uppercase text-craft-paper/55">
            /dev/craft-table · doc 26 · mock data · placeholder art
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h1
              className="font-tdisplay font-extrabold uppercase text-craft-paper"
              style={{ fontSize: 'clamp(56px, 10vw, 128px)', lineHeight: 0.88, letterSpacing: '0.01em' }}
            >
              The Table
            </h1>
            <span
              className="font-tmono text-[11px] tracking-[0.22em] uppercase text-craft-live border-2 border-craft-live px-3 py-1.5 rotate-3 mb-3"
              style={{ borderRadius: '3px 5px 4px 6px' }}
            >
              MVP · v5
            </span>
          </div>
          <p className="font-tbody text-sm sm:text-base text-craft-paper/75 mt-5 max-w-2xl leading-relaxed">
            Scribble day happened with shirts spread on a bedsheet and everyone leaning over
            with markers. So the app is that surface: shirts laid flat on a butcher-paper
            table, every signature a cut-out you tape down, friends leaning over live.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1.5 font-tmono text-[10px] tracking-[0.16em] uppercase text-craft-paper/55">
            <span>1 · My Corner</span>
            <span>2 · The Table</span>
            <span>3 · The Clothesline</span>
            <span>4 · Type + fields</span>
          </div>
        </div>
      </header>

      {/* ── 1 · My Corner ─────────────────────────────────── */}
      <TornDivider fill="transparent" />
      <CornerPoster
        name="Riya Sharma"
        meta="№ 24 · B.Tech CSE"
        markCount={tapedCount}
        friendCount={19}
        lastMarkLine="last by Arjun 4m ago"
        field={field}
        onFieldChange={setField}
        shirtMarks={marks.filter(m => typeof m.number === 'number')}
        notes={posterNotes}
        onSign={() => document.getElementById('ct-studio')?.scrollIntoView({ behavior: 'smooth' })}
        onShare={() => undefined}
      />

      {/* ── 2 · The Table (studio) ────────────────────────── */}
      <TornDivider fill="#6B4F33" />
      <section id="ct-studio" aria-label="The Table studio demo">
        <TableGround className="min-h-[760px]">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-12 py-8">
            <p className="font-tmono text-[10px] tracking-[0.18em] uppercase text-craft-ink-soft">
              Surface 2 · The Table — replaces the signing studio ·{' '}
              <span className="text-craft-ink">{tapedCount} taped</span> · {looseCount} loose · 2 leaning over
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-9 items-start">
              {/* scrap box */}
              <ScrapBox
                stickers={STICKER_SCRAPS}
                notes={NOTE_SCRAPS}
                heldId={held?.scrapId ?? null}
                onSelectSticker={s => setHeld({ kind: 'sticker', scrapId: s.id, stickerId: s.id })}
                onSelectNote={n => setHeld({ kind: 'note', scrapId: n.id, text: n.text, tone: n.tone })}
                className="order-2 md:order-1 md:mt-10"
              />

              {/* the shirt */}
              <div className="order-1 md:order-2 flex justify-center relative">
                <div
                  ref={shirtRef}
                  className="w-full max-w-[340px] sm:max-w-[400px] cursor-crosshair"
                  onPointerMove={e => {
                    if (!held) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setPreview({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }}
                  onPointerLeave={() => setPreview(null)}
                  onClick={e => placeMark(e.clientX, e.clientY)}
                  role="application"
                  aria-label="Shirt — tap to place the held scrap"
                >
                  <TableShirt marks={marks} looseIds={looseIds} />

                  {/* held-scrap ghost preview */}
                  {held && preview ? (
                    <div
                      className="absolute pointer-events-none opacity-60"
                      style={{ left: preview.x, top: preview.y }}
                    >
                      {held.kind === 'sticker' ? (
                        <StickerCutout padding={3} className="-ml-6 -mt-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/scribbl/stickers/${held.stickerId}.svg`}
                            alt=""
                            className="block w-9 h-9"
                          />
                        </StickerCutout>
                      ) : held.kind === 'note' ? (
                        <span
                          className="font-thand text-[14px] px-2 py-1 -ml-10 -mt-5 inline-block"
                          style={{ backgroundColor: held.tone }}
                        >
                          {held.text}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* instrument tray */}
            <InkTray
              selectedInk={selectedInk}
              onSelectInk={setSelectedInk}
              selectedNib={selectedNib}
              onSelectNib={setSelectedNib}
              onUndo={undo}
              canUndo={looseCount > 0}
              onPublish={publish}
              onJustSign={justSign}
              looseCount={looseCount}
              className="mt-9"
            />
            <p className="mt-3 text-center font-tmono text-[9px] tracking-[0.16em] uppercase text-craft-ink-faint">
              pick a scrap → tap the shirt → tape it down (everything here is client-side)
            </p>

            {/* live cursors over the whole table */}
            <LiveCursors users={CURSOR_USERS} className="absolute inset-0" />
          </div>
        </TableGround>
      </section>

      {/* ── 3 · The Clothesline ───────────────────────────── */}
      <TornDivider fill="#EFE7D5" />
      <section aria-label="The Clothesline demo" className="relative">
        <p className="absolute top-3 left-1/2 -translate-x-1/2 font-tmono text-[10px] tracking-[0.18em] uppercase text-craft-ink-soft z-10">
          Surface 3 · The Clothesline — replaces /explore
        </p>
        <ClotheslineStrip items={LINE_SHIRTS} />
      </section>

      {/* ── 4 · tokens & type ─────────────────────────────── */}
      <TornDivider fill="#F2EEE4" />
      <section aria-label="Tokens" className="bg-craft-ground relative">
        <div aria-hidden className="absolute inset-0 opacity-50" style={{ backgroundImage: PAPER_GRAIN }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-12">
          <p className="font-tmono text-[10px] tracking-[0.18em] uppercase text-craft-ink-faint">
            Appendix · type ladder + house fields
          </p>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-5">
              <div>
                <p className="font-tdisplay font-extrabold uppercase text-5xl text-craft-ink leading-[0.9]">
                  The last table
                </p>
                <p className="font-tmono text-[9px] tracking-[0.16em] uppercase text-craft-ink-faint mt-1.5">
                  display · big shoulders 700–800 · tracked caps
                </p>
              </div>
              <div>
                <p className="font-tbody text-[15px] text-craft-ink leading-relaxed">
                  Quiet chrome for lists, forms and settings — the handcraft lives on the
                  fabric, never in the navigation.
                </p>
                <p className="font-tmono text-[9px] tracking-[0.16em] uppercase text-craft-ink-faint mt-1.5">
                  body · archivo
                </p>
              </div>
              <div>
                <p className="font-tmono text-[12px] tracking-[0.14em] uppercase text-craft-ink">
                  № 24 · cse · class of 2026 · 4m ago
                </p>
                <p className="font-tmono text-[9px] tracking-[0.16em] uppercase text-craft-ink-faint mt-1.5">
                  meta · ibm plex mono 11–12px
                </p>
              </div>
              <div>
                <p className="font-thand text-3xl text-craft-ink">only ever on the fabric —</p>
                <p className="font-tmono text-[9px] tracking-[0.16em] uppercase text-craft-ink-faint mt-1">
                  content-only · caveat · never chrome
                </p>
              </div>
            </div>
            <div>
              <p className="font-tmono text-[10px] tracking-[0.16em] uppercase text-craft-ink-soft mb-3">
                House fields
              </p>
              <div className="grid grid-cols-5 gap-2.5">
                {(['marigold', 'cobalt', 'forest', 'oxblood', 'night'] as FieldKey[]).map(f => (
                  <div key={f} className="text-center">
                    <div
                      className="h-16 ring-1 ring-[rgba(25,20,16,0.25)]"
                      style={{
                        backgroundColor:
                          f === 'marigold' ? '#E29A2E' : f === 'cobalt' ? '#2F5FA8' : f === 'forest' ? '#3F6B4A' : f === 'oxblood' ? '#7A2E2E' : '#191410',
                        backgroundImage: PAPER_GRAIN,
                        backgroundBlendMode: 'multiply',
                        borderRadius: '4px 7px 3px 8px / 7px 4px 8px 3px',
                      }}
                    />
                    <p className="font-tmono text-[8px] tracking-[0.12em] uppercase text-craft-ink-faint mt-1.5">
                      {f}
                    </p>
                  </div>
                ))}
              </div>
              <p className="font-tmono text-[10px] tracking-[0.16em] uppercase text-craft-ink-soft mt-7 mb-3">
                Marker inks (content only)
              </p>
              <div className="flex gap-2.5">
                {MARKER_INKS.map(i => (
                  <span
                    key={i.id}
                    title={i.id}
                    className="w-7 h-7 rounded-full ring-1 ring-[rgba(25,20,16,0.2)]"
                    style={{ backgroundColor: i.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
