'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, MessageCircleHeart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/utils/reactions'
import type { ActivityItem } from '@/lib/utils/activity'

interface ActivityLogProps {
  items: ActivityItem[]
  viewerId: string
  title?: string
  eyebrow?: string
  emptyText?: string
  className?: string
}

type LocalReactionState = Record<
  string,
  {
    counts: Record<ReactionEmoji, number>
    viewer: ReactionEmoji[]
  }
>

export function ActivityLog({
  items,
  viewerId,
  title = 'Activity',
  eyebrow = 'Live memories',
  emptyText = 'No scribbles yet.',
  className,
}: ActivityLogProps) {
  const initial = useMemo(() => {
    return Object.fromEntries(
      items.map(item => [
        item.id,
        { counts: item.reactionCounts, viewer: item.viewerReactions },
      ])
    ) as LocalReactionState
  }, [items])
  const [reactions, setReactions] = useState<LocalReactionState>(initial)
  const [pendingId, startTransition] = useTransition()

  useEffect(() => {
    setReactions(initial)
  }, [initial])

  function toggleReaction(itemId: string, emoji: ReactionEmoji) {
    const previous = reactions
    const current = previous[itemId]
    if (!current) return

    const active = current.viewer.includes(emoji)
    const next = {
      ...previous,
      [itemId]: {
        counts: {
          ...current.counts,
          [emoji]: Math.max(0, current.counts[emoji] + (active ? -1 : 1)),
        },
        viewer: active
          ? current.viewer.filter(existing => existing !== emoji)
          : [...current.viewer, emoji],
      },
    }

    setReactions(next)

    startTransition(async () => {
      try {
        const response = await fetch('/api/scribble/react', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ scribble_id: itemId, emoji }),
        })

        if (!response.ok) throw new Error('reaction failed')
      } catch {
        setReactions(previous)
      }
    })
  }

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
        <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-cream-50/60 p-5 text-sm text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const local = reactions[item.id]
            const isMine = item.scribblerId === viewerId
            const signBackHref = isMine ? `/profile/${item.shirtOwnerId}` : `/profile/${item.scribblerId}`
            const signBackLabel = isMine ? 'Open shirt' : 'Sign back'

            return (
              <article
                key={item.id}
                className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-100 bg-cream-50"
                    aria-hidden="true"
                  >
                    {item.canvasSvg ? (
                      <div
                        className="h-full w-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(item.canvasSvg)}")` }}
                      />
                    ) : (
                      <MessageCircleHeart className="h-5 w-5 text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900">
                      <span className="font-semibold">{item.scribblerName}</span>{' '}
                      signed <span className="font-semibold">{item.shirtOwnerName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.panel} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {REACTION_EMOJIS.map(emoji => {
                        const count = local?.counts[emoji] ?? 0
                        const active = local?.viewer.includes(emoji) ?? false

                        return (
                          <button
                            key={emoji}
                            type="button"
                            disabled={pendingId}
                            onClick={() => toggleReaction(item.id, emoji)}
                            className={cn(
                              'h-8 rounded-full border px-2.5 text-xs transition',
                              active
                                ? 'border-ink-900 bg-ink-900 text-white'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            )}
                            aria-label={`React ${emoji}`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="ml-1 font-medium">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Link
                    href={signBackHref}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-ink-900 transition hover:border-ink-900"
                  >
                    {signBackLabel}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
