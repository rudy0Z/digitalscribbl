import test from 'node:test'
import assert from 'node:assert/strict'

import { buildActivityItems } from '../lib/utils/activity.ts'

test('buildActivityItems aggregates supported reactions and marks viewer reactions', () => {
  const items = buildActivityItems({
    viewerId: 'u-viewer',
    shirtOwner: { id: 'u-owner', display_name: 'Owner' },
    scribbles: [
      {
        id:         's1',
        scribbler_id: 'u-friend',
        panel:      'front',
        x:          10,
        y:          20,
        w:          80,
        h:          60,
        canvas_svg: '<svg />',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    users:     [{ id: 'u-friend', display_name: 'Friend' }],
    reactions: [
      { scribble_id: 's1', user_id: 'u-viewer', emoji: '❤️' },
      { scribble_id: 's1', user_id: 'u-other', emoji: '❤️' },
      { scribble_id: 's1', user_id: 'u-other', emoji: '🚀' },
    ],
  })

  assert.equal(items[0].reactionCounts['❤️'], 2)
  assert.deepEqual(items[0].viewerReactions, ['❤️'])
})
