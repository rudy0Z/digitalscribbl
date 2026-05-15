import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeScribbleSvg } from '../lib/utils/sanitizeSvg.ts'

test('sanitizeScribbleSvg accepts basic fabric svg markup', () => {
  const svg = '<svg width="100" height="50" viewBox="0 0 100 50"><path d="M0 0 L10 10" stroke="#000" fill="none"/></svg>'

  const result = sanitizeScribbleSvg(svg)

  assert.equal(result.ok, true)
  assert.match(result.svg, /<svg/)
  assert.match(result.svg, /<path/)
})

test('sanitizeScribbleSvg rejects active svg content', () => {
  const svg = '<svg width="100" height="50" onload="alert(1)"><script>alert(1)</script><path d="M0 0 L10 10"/></svg>'

  const result = sanitizeScribbleSvg(svg)

  assert.equal(result.ok, false)
  assert.match(result.error, /unsafe/i)
})

test('sanitizeScribbleSvg rejects external resource references', () => {
  const svg = '<svg width="100" height="50"><image href="https://evil.example/x.png"/></svg>'

  const result = sanitizeScribbleSvg(svg)

  assert.equal(result.ok, false)
  assert.match(result.error, /external/i)
})
