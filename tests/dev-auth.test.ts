import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAvailableDevAuthSlots,
  getDevAuthSlot,
  getDevAuthUserId,
  isDevAuthBypassEnabled,
} from '../lib/auth/dev.ts'

test('dev auth bypass is disabled by default', () => {
  assert.equal(isDevAuthBypassEnabled({}), false)
})

test('dev auth bypass requires both flag and user id', () => {
  assert.equal(isDevAuthBypassEnabled({ DEV_AUTH_BYPASS: 'true' }), false)
  assert.equal(isDevAuthBypassEnabled({ DEV_AUTH_USER_ID: 'user-1' }), false)
})

test('dev auth bypass accepts true-like values', () => {
  assert.equal(isDevAuthBypassEnabled({ DEV_AUTH_BYPASS: 'true', DEV_AUTH_USER_ID: 'user-1' }), true)
  assert.equal(isDevAuthBypassEnabled({ DEV_AUTH_BYPASS: '1', DEV_AUTH_USER_ID: 'user-1' }), true)
  assert.equal(isDevAuthBypassEnabled({ DEV_AUTH_BYPASS: 'yes', DEV_AUTH_USER_ID: 'user-1' }), true)
})

test('getDevAuthUserId trims and returns empty when unset', () => {
  assert.equal(getDevAuthUserId({}), '')
  assert.equal(getDevAuthUserId({ DEV_AUTH_USER_ID: '  abc-123  ' }), 'abc-123')
})

test('dev auth supports per-slot user ids', () => {
  assert.equal(getDevAuthUserId({ DEV_AUTH_USER_2_ID: 'user-2' }, '2'), 'user-2')
  assert.equal(getDevAuthUserId({ DEV_AUTH_USER_2_ID: 'user-2' }, '9'), '')
})

test('dev auth slot normalization falls back to slot 1', () => {
  assert.equal(getDevAuthSlot('2'), '2')
  assert.equal(getDevAuthSlot('0'), '1')
  assert.equal(getDevAuthSlot(undefined), '1')
})

test('dev auth lists only configured slots', () => {
  assert.deepEqual(
    getAvailableDevAuthSlots({
      DEV_AUTH_USER_1_ID: 'user-1',
      DEV_AUTH_USER_3_ID: 'user-3',
    }),
    [
      { slot: '1', userId: 'user-1' },
      { slot: '3', userId: 'user-3' },
    ]
  )
})
