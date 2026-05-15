import test from 'node:test'
import assert from 'node:assert/strict'

import { getPublicSiteUrl } from '../lib/utils/siteUrl.ts'

test('getPublicSiteUrl prefers NEXT_PUBLIC_SITE_URL', () => {
  const url = getPublicSiteUrl({
    NEXT_PUBLIC_SITE_URL: 'https://scribbl.example/',
    NEXT_PUBLIC_APP_URL: 'https://ignored.example',
  })

  assert.equal(url, 'https://scribbl.example')
})

test('getPublicSiteUrl falls back to NEXT_PUBLIC_APP_URL', () => {
  const url = getPublicSiteUrl({
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000/',
  })

  assert.equal(url, 'http://localhost:3000')
})

test('getPublicSiteUrl returns empty string when no public URL is configured', () => {
  assert.equal(getPublicSiteUrl({}), '')
})
