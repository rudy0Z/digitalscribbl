import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canExportProfileCard,
  getExportRequestType,
  normalizeExportRequestNote,
} from '../lib/utils/exportAccess.ts'

test('profile card exports are limited to the owner unless caller is admin', () => {
  assert.equal(canExportProfileCard({ viewerId: 'u1', targetUserId: 'u1', isAdmin: false }), true)
  assert.equal(canExportProfileCard({ viewerId: 'u1', targetUserId: 'u2', isAdmin: false }), false)
  assert.equal(canExportProfileCard({ viewerId: 'admin', targetUserId: 'u2', isAdmin: true }), true)
})

test('export request types are intentionally limited to manual batch or group requests', () => {
  assert.equal(getExportRequestType('batch'), 'batch')
  assert.equal(getExportRequestType('group'), 'group')
  assert.equal(getExportRequestType('profile'), null)
  assert.equal(getExportRequestType('all'), null)
})

test('request notes are trimmed and capped', () => {
  assert.equal(normalizeExportRequestNote('  CS 2025 farewell  '), 'CS 2025 farewell')
  const longNote = normalizeExportRequestNote('x'.repeat(400))
  assert.ok(longNote)
  assert.equal(longNote.length, 240)
  assert.equal(normalizeExportRequestNote(123), null)
})
