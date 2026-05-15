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

test('sanitizeScribbleSvg accepts svg with xml declaration', () => {
  const svg = '<?xml version="1.0" encoding="UTF-8"?><svg width="100" height="50" viewBox="0 0 100 50"><rect width="10" height="10"/></svg>'

  const result = sanitizeScribbleSvg(svg)

  assert.equal(result.ok, true)
  assert.match(result.svg, /^<svg/i)
})

test('sanitizeScribbleSvg accepts fabric svg with doctype and generator comment', () => {
  const svg = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>',
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"',
    '  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    '<!-- Created with Fabric.js 7.3.1 -->',
    '<svg width="100" height="50" viewBox="0 0 100 50"><path d="M0 0 L10 10"/></svg>',
  ].join('\n')

  const result = sanitizeScribbleSvg(svg)

  assert.equal(result.ok, true)
  assert.match(result.svg, /^<svg/i)
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
