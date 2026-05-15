import test from 'node:test'
import assert from 'node:assert/strict'

import { getReactionEmoji, REACTION_EMOJIS } from '../lib/utils/reactions.ts'

test('reaction emoji set stays small and ordered for cheap UI rendering', () => {
  assert.deepEqual(REACTION_EMOJIS, ['❤️', '😂', '🥹', '🔥', '✨', '🫶'])
})

test('getReactionEmoji accepts only supported reaction values', () => {
  assert.equal(getReactionEmoji('❤️'), '❤️')
  assert.equal(getReactionEmoji('🫶'), '🫶')
  assert.equal(getReactionEmoji(''), null)
  assert.equal(getReactionEmoji('🚀'), null)
  assert.equal(getReactionEmoji(42), null)
})
