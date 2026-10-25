'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface CursorUser {
  id: string
  name: string
  color: string
  /** deterministic motion params (0-1 base position, amplitude, speed, phase) */
  baseX: number
  baseY: number
  ampX: number
  ampY: number
  speed: number
  phase: number
}

interface LiveCursorsProps {
  users: CursorUser[]
  className?: string
}

/**
 * Live pencil cursors — friends leaning over the table (doc 26 §3).
 * MVP: mocked friends drifting on sine paths via rAF, writing transform
 * directly to DOM nodes so React never re-renders per frame.
 * Phase 3 replaces the motion source with Supabase Realtime presence.
 */
export default function LiveCursors({ users, className }: LiveCursorsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // place each cursor once, statically
      users.forEach((u, i) => {
        const node = nodeRefs.current[i]
        if (node) {
          node.style.transform = `translate(${u.baseX * 100}cqw, ${u.baseY * 100}cqh)`
        }
      })
      return
    }

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      users.forEach((u, i) => {
        const node = nodeRefs.current[i]
        if (!node) return
        const x = u.baseX + u.ampX * Math.sin(t * u.speed + u.phase)
        const y = u.baseY + u.ampY * Math.sin(t * u.speed * 0.8 + u.phase * 1.7)
        node.style.transform = `translate(${x * 100}cqw, ${y * 100}cqh)`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [users])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{ containerType: 'size' }}
    >
      {users.map((u, i) => (
        <div
          key={u.id}
          ref={node => {
            nodeRefs.current[i] = node
          }}
          className="absolute left-0 top-0 will-change-transform"
        >
          {/* pencil tip cursor */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 -ml-[2px] -mt-[2px] drop-shadow-sm">
            <g transform="rotate(45 12 12)">
              <rect x="10" y="4" width="4" height="13" rx="1" fill={u.color} />
              <rect x="10" y="15" width="4" height="2.5" fill="#F2EEE4" />
              <path d="M10 17.5 L14 17.5 L12 22 Z" fill="#2D2923" />
              <rect x="10" y="2.5" width="4" height="2" rx="0.8" fill={u.color} opacity="0.75" />
            </g>
          </svg>
          <span
            className="ml-3 -mt-1 inline-block px-1.5 py-[2px] rounded-[3px] text-craft-paper font-tmono text-[9px] tracking-[0.12em] whitespace-nowrap"
            style={{ backgroundColor: u.color }}
          >
            {u.name}
          </span>
        </div>
      ))}
    </div>
  )
}
