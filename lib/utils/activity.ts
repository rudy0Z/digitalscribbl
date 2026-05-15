import { emptyReactionCounts, getReactionEmoji, type ReactionEmoji } from './reactions.ts'

export interface ActivityScribbleInput {
  id: string
  scribbler_id: string
  panel: string
  x: number
  y: number
  w: number
  h: number
  canvas_svg: string | null
  created_at: string
}

export interface ActivityUserInput {
  id: string
  display_name: string
}

export interface ActivityReactionInput {
  scribble_id: string
  user_id: string
  emoji: string
}

export interface ActivityPerson {
  id: string
  display_name: string
}

export interface ActivityItem {
  id: string
  panel: string
  createdAt: string
  x: number
  y: number
  w: number
  h: number
  canvasSvg: string | null
  shirtOwnerId: string
  shirtOwnerName: string
  scribblerId: string
  scribblerName: string
  reactionCounts: Record<ReactionEmoji, number>
  viewerReactions: ReactionEmoji[]
}

export function buildActivityItems({
  viewerId,
  shirtOwner,
  scribbles,
  users,
  reactions,
}: {
  viewerId: string
  shirtOwner: ActivityPerson
  scribbles: ActivityScribbleInput[]
  users: ActivityUserInput[]
  reactions: ActivityReactionInput[]
}): ActivityItem[] {
  const userNameById = new Map(users.map(user => [user.id, user.display_name]))
  const reactionsByScribble = new Map<string, ActivityReactionInput[]>()

  for (const reaction of reactions) {
    const emoji = getReactionEmoji(reaction.emoji)
    if (!emoji) continue

    const existing = reactionsByScribble.get(reaction.scribble_id) ?? []
    existing.push(reaction)
    reactionsByScribble.set(reaction.scribble_id, existing)
  }

  return scribbles.map(scribble => {
    const reactionCounts = emptyReactionCounts()
    const viewerReactions: ReactionEmoji[] = []

    for (const reaction of reactionsByScribble.get(scribble.id) ?? []) {
      const emoji = getReactionEmoji(reaction.emoji)
      if (!emoji) continue

      reactionCounts[emoji] += 1
      if (reaction.user_id === viewerId && !viewerReactions.includes(emoji)) {
        viewerReactions.push(emoji)
      }
    }

    return {
      id:              scribble.id,
      panel:           scribble.panel,
      createdAt:       scribble.created_at,
      x:               scribble.x,
      y:               scribble.y,
      w:               scribble.w,
      h:               scribble.h,
      canvasSvg:       scribble.canvas_svg,
      shirtOwnerId:    shirtOwner.id,
      shirtOwnerName:  shirtOwner.display_name,
      scribblerId:     scribble.scribbler_id,
      scribblerName:   userNameById.get(scribble.scribbler_id) ?? 'Someone',
      reactionCounts,
      viewerReactions,
    }
  })
}
