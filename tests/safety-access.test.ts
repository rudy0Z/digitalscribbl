import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAttemptScribble,
  getAccountKind,
  isAllowedEmailDomain,
  normalizeReportReason,
} from '../lib/utils/safetyAccess.ts'

test('university verification is based on configured email domains', () => {
  assert.equal(isAllowedEmailDomain('student@college.edu', ['college.edu']), true)
  assert.equal(isAllowedEmailDomain('student@other.edu', ['college.edu']), false)
  assert.equal(isAllowedEmailDomain('bad-email', ['college.edu']), false)
})

test('account kind separates university and external users', () => {
  assert.equal(getAccountKind('student@college.edu', ['college.edu']), 'university')
  assert.equal(getAccountKind('friend@gmail.com', ['college.edu']), 'external')
})

test('external and out-of-batch users can scribble only with owner approval', () => {
  assert.equal(canAttemptScribble({ isOwner: false, permission: 'open', sameBatch: false, approvedRequest: false }), true)
  assert.equal(canAttemptScribble({ isOwner: false, permission: 'batch_only', sameBatch: false, approvedRequest: false }), false)
  assert.equal(canAttemptScribble({ isOwner: false, permission: 'batch_only', sameBatch: false, approvedRequest: true }), true)
  assert.equal(canAttemptScribble({ isOwner: false, permission: 'request_only', sameBatch: true, approvedRequest: false }), false)
  assert.equal(canAttemptScribble({ isOwner: false, permission: 'request_only', sameBatch: false, approvedRequest: true }), true)
  assert.equal(canAttemptScribble({ isOwner: true, permission: 'open', sameBatch: true, approvedRequest: true }), false)
})

test('report reasons are capped and non-empty', () => {
  assert.equal(normalizeReportReason('  abusive content  '), 'abusive content')
  assert.equal(normalizeReportReason('x'.repeat(500))?.length, 240)
  assert.equal(normalizeReportReason(''), null)
})
