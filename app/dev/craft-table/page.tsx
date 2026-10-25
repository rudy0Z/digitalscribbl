// "The Table" — design system v5 demo page (dev only). Doc 26.
// Visual QA harness for the craft-table MVP: My Corner, The Table studio,
// The Clothesline. Hidden in production like /dev/sunlit-lawn.
// Fonts are loaded here (not in the root layout) so the v5 type ladder
// (--tfont-* vars) stays scoped to surfaces that opt in.
//
// NOTE: deliberately NO `force-dynamic` — the page is fully static (mock
// data, no DB), which lets it prerender. Streaming responses never finish
// revealing in some embedded browsers, so static output keeps the demo
// reliable everywhere.

import { notFound } from 'next/navigation'
import { Big_Shoulders, Archivo, IBM_Plex_Mono, Caveat } from 'next/font/google'
import CraftTableDemo from './CraftTableDemo'

const bigShoulders = Big_Shoulders({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--tfont-display',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--tfont-body',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tfont-mono',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--tfont-hand',
  display: 'swap',
})

export default function CraftTableDemoPage() {
  // Hidden in production deploys unless explicitly enabled with
  // SHOW_CRAFT_DEMO=1 — lets the founder preview the static build locally.
  if (process.env.NODE_ENV === 'production' && process.env.SHOW_CRAFT_DEMO !== '1') {
    notFound()
  }

  return (
    <div
      className={`${bigShoulders.variable} ${archivo.variable} ${plexMono.variable} ${caveat.variable} font-tbody`}
    >
      <CraftTableDemo />
    </div>
  )
}
