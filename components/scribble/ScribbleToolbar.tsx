'use client'

import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils/cn'
import {
  TOOL_PEN, TOOL_PENCIL, TOOL_TEXT, TOOL_LINE, TOOL_CIRCLE,
  TOOL_RECT, TOOL_ARROW, TOOL_ERASER, TOOL_SELECT, CANVAS_COLORS,
} from '@/lib/constants'
import type { DrawingTool } from './DrawingCanvas'

// ── Types ─────────────────────────────────────────────────────

interface ScribbleToolbarProps {
  tool:        DrawingTool
  color:       string
  brushSize:   number
  opacity:     number           // 0.1 – 1
  fillShapes:  boolean
  fontSize:    'sm' | 'md' | 'lg'
  fontStyle:   'normal' | 'bold' | 'italic'
  onTool:      (t: DrawingTool) => void
  onColor:     (c: string) => void
  onBrushSize: (s: number) => void
  onOpacity:   (o: number) => void
  onFill:      (f: boolean) => void
  onFontSize:  (s: 'sm' | 'md' | 'lg') => void
  onFontStyle: (s: 'normal' | 'bold' | 'italic') => void
  onUndo:      () => void
  onClear:     () => void
  onPlace:     () => void
  isPlacing:   boolean
  canPlace:    boolean
}

// ── Tool definitions ──────────────────────────────────────────

const TOOLS: { id: DrawingTool; label: string; icon: string }[] = [
  { id: TOOL_PEN,    label: 'Pen',     icon: '✏️' },
  { id: TOOL_PENCIL, label: 'Pencil',  icon: '🖊️' },
  { id: TOOL_ERASER, label: 'Remove stroke', icon: '⌫' },
  { id: TOOL_SELECT, label: 'Select',  icon: '↖'  },
  { id: TOOL_TEXT,   label: 'Text',    icon: 'T'   },
  { id: TOOL_LINE,   label: 'Line',    icon: '╱'   },
  { id: TOOL_ARROW,  label: 'Arrow',   icon: '→'   },
  { id: TOOL_RECT,   label: 'Rect',    icon: '□'   },
  { id: TOOL_CIRCLE, label: 'Circle',  icon: '○'   },
]

const SHAPE_TOOLS = [TOOL_RECT, TOOL_CIRCLE, TOOL_ARROW] as DrawingTool[]
const FREEHAND_TOOLS = [TOOL_PEN, TOOL_PENCIL, TOOL_ERASER] as DrawingTool[]

// ── Component ─────────────────────────────────────────────────

export default function ScribbleToolbar({
  tool, color, brushSize, opacity, fillShapes, fontSize, fontStyle,
  onTool, onColor, onBrushSize, onOpacity, onFill,
  onFontSize, onFontStyle, onUndo, onClear, onPlace, isPlacing,
  canPlace,
}: ScribbleToolbarProps) {
  const [showPicker, setShowPicker] = useState(false)

  const isCustomColor = !CANVAS_COLORS.includes(color as typeof CANVAS_COLORS[number])

  return (
    /*
      Desktop: fixed-width vertical panel on the right
      Mobile:  full-width horizontal strip below the canvas (set in ShirtView)
    */
    <div className="flex flex-col gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-md w-full md:w-52 text-sm">

      {/* ── Tools ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tools</p>
        <div className="grid grid-cols-5 md:grid-cols-3 gap-1">
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => onTool(t.id)}
              className={cn(
                'aspect-square rounded-lg text-base flex items-center justify-center transition font-mono',
                tool === t.id
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-ink-700'
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Colour ────────────────────────────────────────── */}
      {tool !== TOOL_ERASER && tool !== TOOL_SELECT && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Colour</p>
          <div className="flex flex-wrap gap-1.5">
            {CANVAS_COLORS.map(c => (
              <button
                key={c}
                title={c}
                onClick={() => { onColor(c); setShowPicker(false) }}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition flex-shrink-0',
                  color === c ? 'border-ink-900 scale-110' : 'border-transparent hover:scale-105',
                  c === '#FFFFFF' && 'border-gray-200'  // white needs a border to be visible
                )}
                style={{ background: c }}
              />
            ))}
            {/* Custom colour swatch */}
            <button
              title="Custom colour"
              onClick={() => setShowPicker(v => !v)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition flex-shrink-0',
                showPicker ? 'border-ink-900' : 'border-gray-200'
              )}
              style={{
                background: isCustomColor
                  ? color
                  : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
              }}
            />
          </div>
          {showPicker && (
            <div className="mt-2">
              <HexColorPicker color={color} onChange={onColor} style={{ width: '100%', height: 120 }} />
            </div>
          )}
        </div>
      )}

      {/* ── Opacity ───────────────────────────────────────── */}
      {tool !== TOOL_SELECT && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Opacity — {Math.round(opacity * 100)}%
          </p>
          <input
            type="range" min={10} max={100} step={5}
            value={Math.round(opacity * 100)}
            onChange={e => onOpacity(Number(e.target.value) / 100)}
            className="w-full accent-ink-900"
          />
        </div>
      )}

      {/* ── Brush / stroke size ───────────────────────────── */}
      {tool !== TOOL_TEXT && tool !== TOOL_SELECT && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {tool === TOOL_ERASER ? 'Eraser size' : 'Stroke'} — {brushSize}px
          </p>
          <input
            type="range"
            min={tool === TOOL_ERASER ? 4 : 1}
            max={tool === TOOL_ERASER ? 40 : 24}
            value={brushSize}
            onChange={e => onBrushSize(Number(e.target.value))}
            className="w-full accent-ink-900"
          />
        </div>
      )}

      {/* ── Fill toggle (shapes only) ─────────────────────── */}
      {SHAPE_TOOLS.includes(tool) && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fill shape</p>
          <button
            onClick={() => onFill(!fillShapes)}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
              fillShapes ? 'bg-ink-900' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
              fillShapes ? 'translate-x-4.5' : 'translate-x-0.5'
            )} />
          </button>
        </div>
      )}

      {/* ── Text controls ─────────────────────────────────── */}
      {tool === TOOL_TEXT && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Text</p>
          <div className="flex gap-1 mb-1">
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button key={s} onClick={() => onFontSize(s)}
                className={cn(
                  'flex-1 text-xs py-1 rounded-lg border transition',
                  fontSize === s ? 'bg-ink-900 text-white border-ink-900' : 'border-gray-200 hover:bg-gray-50'
                )}>
                {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
              </button>
            ))}
            <button onClick={() => onFontStyle(fontStyle === 'bold' ? 'normal' : 'bold')}
              className={cn(
                'px-2.5 py-1 rounded-lg border text-xs font-bold transition',
                fontStyle === 'bold' ? 'bg-ink-900 text-white border-ink-900' : 'border-gray-200 hover:bg-gray-50'
              )}>B</button>
            <button onClick={() => onFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
              className={cn(
                'px-2.5 py-1 rounded-lg border text-xs italic transition',
                fontStyle === 'italic' ? 'bg-ink-900 text-white border-ink-900' : 'border-gray-200 hover:bg-gray-50'
              )}>I</button>
          </div>
        </div>
      )}

      {/* ── Select-mode hint ──────────────────────────────── */}
      {tool === TOOL_SELECT && (
        <p className="text-xs text-gray-400 text-center py-1">
          Click objects to select, drag to move
        </p>
      )}

      <hr className="border-gray-100" />

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="flex gap-1.5">
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className="flex-1 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600 text-xs"
        >
          ↩ Undo
        </button>
        <button
          onClick={onClear}
          title="Clear canvas"
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition text-gray-400 text-xs"
        >
          ✕
        </button>
      </div>

      <button
        onClick={onPlace}
          disabled={isPlacing || !canPlace}
          className="w-full py-2.5 rounded-xl bg-ink-900 hover:bg-ink-700 text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
        {isPlacing ? 'Placing…' : '✓ Place Scribble'}
      </button>
    </div>
  )
}
