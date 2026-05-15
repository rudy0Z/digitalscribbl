export const REACTION_EMOJIS = ['❤️', '😂', '🥹', '🔥', '✨', '🫶'] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

const REACTION_SET = new Set<string>(REACTION_EMOJIS)

export function getReactionEmoji(value: unknown): ReactionEmoji | null {
  if (typeof value !== 'string') return null
  return REACTION_SET.has(value) ? (value as ReactionEmoji) : null
}

export function emptyReactionCounts(): Record<ReactionEmoji, number> {
  return Object.fromEntries(REACTION_EMOJIS.map(emoji => [emoji, 0])) as Record<ReactionEmoji, number>
}
