/**
 * Paper-grain texture system for "The Table" (doc 26).
 * SVG turbulence rendered to a data-URI so any element can wear real fiber
 * noise as a background-image — the cheap trick that makes flat surfaces
 * feel like paper.
 */

export function grainDataUri(opacity = 0.55, baseFrequency = 0.9): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 ${opacity} 0'/>` +
    `</filter>` +
    `<rect width='180' height='180' filter='url(#n)'/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** PAPER_GRAIN — reuse this one constant everywhere so the grain matches. */
export const PAPER_GRAIN = grainDataUri(0.5)
export const PAPER_GRAIN_SOFT = grainDataUri(0.3, 1.2)
export const FIELD_GRAIN = grainDataUri(0.4, 0.7)
