import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clampScribbleBoxToCanvas,
  hasDrawableFabricJson,
  normalizeScribbleBox,
} from '../lib/utils/scribbleContract.ts'
import { boxesOverlap } from '../lib/utils/collision.ts'

test('normalizeScribbleBox rounds finite fractional values to DB-safe integers', () => {
  const result = normalizeScribbleBox({ x: 10.49, y: 375.83333333333337, w: 139.5, h: 99.51 })

  assert.equal(result.ok, true)
  assert.deepEqual(result.box, { x: 10, y: 376, w: 140, h: 100 })
})

test('normalizeScribbleBox rejects non-finite or out-of-bounds values', () => {
  assert.deepEqual(normalizeScribbleBox({ x: Number.NaN, y: 10, w: 100, h: 100 }), {
    ok: false,
    code: 'INVALID_BOX',
    error: 'Bounding box values must be finite numbers',
  })

  const result = normalizeScribbleBox({ x: 380, y: 10, w: 40, h: 100 })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'INVALID_BOX')
  assert.match(result.error, /bounds/i)
})

test('clampScribbleBoxToCanvas rounds and keeps client placement inside the shirt canvas', () => {
  const box = clampScribbleBoxToCanvas({ x: 388.8, y: 590.2, w: 39.7, h: 39.7 })

  assert.deepEqual(box, { x: 360, y: 560, w: 40, h: 40 })
})

test('rounded candidate boxes use the same edge-touching collision behavior', () => {
  const normalized = normalizeScribbleBox({ x: 39.6, y: 0, w: 40, h: 40 })
  assert.equal(normalized.ok, true)

  assert.equal(boxesOverlap(normalized.box, { x: 0, y: 0, w: 40, h: 40 }), false)
})

test('hasDrawableFabricJson rejects empty Fabric payloads', () => {
  assert.equal(hasDrawableFabricJson(null), false)
  assert.equal(hasDrawableFabricJson({}), false)
  assert.equal(hasDrawableFabricJson({ version: '7.3.1', objects: [] }), false)
  assert.equal(hasDrawableFabricJson({ objects: [{ type: 'i-text', text: '   ' }] }), false)
})

test('hasDrawableFabricJson accepts drawn paths, shapes, and non-empty text', () => {
  assert.equal(hasDrawableFabricJson({ objects: [{ type: 'path', path: [['M', 1, 1], ['L', 5, 5]] }] }), true)
  assert.equal(hasDrawableFabricJson({ objects: [{ type: 'rect', width: 30, height: 20 }] }), true)
  assert.equal(hasDrawableFabricJson({ objects: [{ type: 'i-text', text: 'farewell' }] }), true)
})
