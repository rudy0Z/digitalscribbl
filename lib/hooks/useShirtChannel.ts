'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { THROTTLE_BOX_MS, THROTTLE_STROKE_MS } from '@/lib/constants'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Panel } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────

export interface GhostBox {
  userId:      string
  displayName: string
  panel:       Panel
  x:           number
  y:           number
  w:           number
  h:           number
  isPlanted:   boolean
  lastSeen:    number
}

export interface StrokeEvent {
  userId:     string
  fabricJson: object   // incremental Fabric.js canvas state
}

export interface LivePresence {
  userId:      string
  displayName: string
  joinedAt:    string
}

// ── Hook ──────────────────────────────────────────────────────

interface UseShirtChannelOptions {
  ownerId:         string
  shirtNumber:     number
  currentPanel:    Panel
  currentUserId:   string | null
  currentUserName: string | null
}

interface UseShirtChannelReturn {
  /** Map of userId → GhostBox for all other active scribblers */
  ghostBoxes:    Map<string, GhostBox>
  /** Number of users currently viewing this shirt (Supabase Presence) */
  viewerCount:   number
  /**
   * Increments whenever a texture_updated event is received.
   * Components can watch this to reload the shirt image.
   */
  textureVersion: number
  isConnected:   boolean

  // Outgoing broadcasts (throttled)
  broadcastBoxMoved:   (x: number, y: number, w: number, h: number) => void
  broadcastBoxPlanted: (x: number, y: number, w: number, h: number) => void
  broadcastBoxReleased: () => void
  broadcastStroke:     (fabricJson: object) => void

  // Broadcast that the texture was just updated (triggers cache-bust for all viewers)
  broadcastTextureUpdated: (panel: Panel) => void

  // Register listeners — set null to unregister
  setStrokeHandler:   (handler: ((event: StrokeEvent) => void) | null) => void
  setTextureHandler:  (handler: ((panel: Panel) => void) | null) => void
}

export function useShirtChannel({
  ownerId,
  shirtNumber,
  currentPanel,
  currentUserId,
  currentUserName,
}: UseShirtChannelOptions): UseShirtChannelReturn {
  // Create the Supabase client once on mount — not on every render
  const supabaseRef     = useRef(createClient())
  const channelRef      = useRef<RealtimeChannel | null>(null)
  const lastBoxMoveRef  = useRef(0)
  const lastStrokeRef   = useRef(0)
  const strokeHandlerRef  = useRef<((e: StrokeEvent) => void) | null>(null)
  const textureHandlerRef = useRef<((panel: Panel) => void) | null>(null)

  const [ghostBoxes,    setGhostBoxes]    = useState<Map<string, GhostBox>>(new Map())
  const [viewerCount,   setViewerCount]   = useState(0)
  const [textureVersion, setTextureVersion] = useState(0)
  const [isConnected,   setIsConnected]   = useState(false)

  useEffect(() => {
    if (!ownerId) return

    const supabase    = supabaseRef.current
    const channelName = `shirt:${ownerId}:${shirtNumber}`

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence:  { key: currentUserId ?? `anon-${Math.random()}` },
      },
    })

    // ── Broadcast listeners ────────────────────────────────
    channel.on('broadcast', { event: 'box_moved' }, ({ payload }) => {
      setGhostBoxes(prev => {
        const next = new Map(prev)
        next.set(payload.userId, {
          userId:      payload.userId,
          displayName: payload.displayName ?? 'Someone',
          panel:       payload.panel,
          x:           payload.x,
          y:           payload.y,
          w:           payload.w,
          h:           payload.h,
          isPlanted:   false,
          lastSeen:    Date.now(),
        })
        return next
      })
    })

    channel.on('broadcast', { event: 'box_planted' }, ({ payload }) => {
      setGhostBoxes(prev => {
        const next = new Map(prev)
        next.set(payload.userId, {
          userId:      payload.userId,
          displayName: payload.displayName ?? 'Someone',
          panel:       payload.panel,
          x:           payload.x,
          y:           payload.y,
          w:           payload.w,
          h:           payload.h,
          isPlanted:   true,
          lastSeen:    Date.now(),
        })
        return next
      })
    })

    channel.on('broadcast', { event: 'box_released' }, ({ payload }) => {
      setGhostBoxes(prev => {
        const next = new Map(prev)
        next.delete(payload.userId)
        return next
      })
    })

    channel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
      strokeHandlerRef.current?.({
        userId:     payload.userId,
        fabricJson: payload.fabricJson,
      })
    })

    channel.on('broadcast', { event: 'texture_updated' }, ({ payload }) => {
      setTextureVersion(v => v + 1)
      textureHandlerRef.current?.(payload.panel as Panel)
    })

    // ── Presence listeners ─────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<LivePresence>()
      setViewerCount(Object.keys(state).length)
    })

    channel.on('presence', { event: 'join' }, () => {
      const state = channel.presenceState<LivePresence>()
      setViewerCount(Object.keys(state).length)
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      // Remove ghost boxes for users who disconnected
      const leftIds = (leftPresences as unknown as Array<{ key: string }>).map(p => p.key)
      setGhostBoxes(prev => {
        const next = new Map(prev)
        leftIds.forEach(id => next.delete(id))
        return next
      })
      const state = channel.presenceState<LivePresence>()
      setViewerCount(Object.keys(state).length)
    })

    // ── Subscribe ──────────────────────────────────────────
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        if (currentUserId) {
          await channel.track({
            userId:      currentUserId,
            displayName: currentUserName ?? 'Unknown',
            joinedAt:    new Date().toISOString(),
          })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    // Stale ghost box cleanup — remove boxes not seen in 30s
    const cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - 30_000
      setGhostBoxes(prev => {
        const hasStale = Array.from(prev.values()).some(b => b.lastSeen < cutoff)
        if (!hasStale) return prev
        const next = new Map(prev)
        for (const [id, box] of Array.from(next)) {
          if (box.lastSeen < cutoff) next.delete(id)
        }
        return next
      })
    }, 10_000)

    return () => {
      clearInterval(cleanupInterval)
      supabase.removeChannel(channel)
      setIsConnected(false)
      setGhostBoxes(new Map())
    }
    // Re-subscribe only when shirt identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, shirtNumber, currentUserId])

  // ── Outgoing broadcasts ────────────────────────────────────

  const broadcastBoxMoved = useCallback((x: number, y: number, w: number, h: number) => {
    const now = Date.now()
    if (now - lastBoxMoveRef.current < THROTTLE_BOX_MS) return
    lastBoxMoveRef.current = now
    channelRef.current?.send({
      type:    'broadcast',
      event:   'box_moved',
      payload: {
        userId:      currentUserId,
        displayName: currentUserName,
        panel:       currentPanel,
        x, y, w, h,
      },
    })
  }, [currentUserId, currentUserName, currentPanel])

  const broadcastBoxPlanted = useCallback((x: number, y: number, w: number, h: number) => {
    channelRef.current?.send({
      type:    'broadcast',
      event:   'box_planted',
      payload: {
        userId:      currentUserId,
        displayName: currentUserName,
        panel:       currentPanel,
        x, y, w, h,
      },
    })
  }, [currentUserId, currentUserName, currentPanel])

  const broadcastBoxReleased = useCallback(() => {
    channelRef.current?.send({
      type:    'broadcast',
      event:   'box_released',
      payload: { userId: currentUserId },
    })
  }, [currentUserId])

  const broadcastStroke = useCallback((fabricJson: object) => {
    const now = Date.now()
    if (now - lastStrokeRef.current < THROTTLE_STROKE_MS) return
    lastStrokeRef.current = now
    channelRef.current?.send({
      type:    'broadcast',
      event:   'stroke',
      payload: { userId: currentUserId, fabricJson },
    })
  }, [currentUserId])

  const broadcastTextureUpdated = useCallback((panel: Panel) => {
    channelRef.current?.send({
      type:    'broadcast',
      event:   'texture_updated',
      payload: { panel },
    })
  }, [])

  const setStrokeHandler = useCallback((handler: ((e: StrokeEvent) => void) | null) => {
    strokeHandlerRef.current = handler
  }, [])

  const setTextureHandler = useCallback((handler: ((panel: Panel) => void) | null) => {
    textureHandlerRef.current = handler
  }, [])

  return {
    ghostBoxes,
    viewerCount,
    textureVersion,
    isConnected,
    broadcastBoxMoved,
    broadcastBoxPlanted,
    broadcastBoxReleased,
    broadcastStroke,
    broadcastTextureUpdated,
    setStrokeHandler,
    setTextureHandler,
  }
}
