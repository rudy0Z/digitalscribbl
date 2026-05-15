const MAX_SVG_BYTES = 512_000

const ACTIVE_CONTENT_PATTERN =
  /<\s*(script|foreignObject|iframe|object|embed|audio|video|canvas|use|animate|animateMotion|animateTransform|set)\b/i

const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=/i

const JAVASCRIPT_URL_PATTERN = /(href|xlink:href|src)\s*=\s*(['"])\s*javascript:/i

const EXTERNAL_REFERENCE_PATTERN =
  /(href|xlink:href|src)\s*=\s*(['"])\s*(https?:)?\/\//i

const CSS_URL_PATTERN = /url\s*\(\s*(['"])?\s*(https?:|\/\/|javascript:)/i

export type SanitizedSvgResult =
  | { ok: true; svg: string }
  | { ok: false; error: string }

export function sanitizeScribbleSvg(input: unknown): SanitizedSvgResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'SVG is required' }
  }

  const svg = input.trim()

  if (!svg) {
    return { ok: false, error: 'SVG is empty' }
  }

  if (Buffer.byteLength(svg, 'utf8') > MAX_SVG_BYTES) {
    return { ok: false, error: 'SVG is too large' }
  }

  if (!/^<svg[\s>]/i.test(svg)) {
    return { ok: false, error: 'Invalid SVG root' }
  }

  if (ACTIVE_CONTENT_PATTERN.test(svg) || EVENT_HANDLER_PATTERN.test(svg) || JAVASCRIPT_URL_PATTERN.test(svg)) {
    return { ok: false, error: 'Unsafe SVG content is not allowed' }
  }

  if (EXTERNAL_REFERENCE_PATTERN.test(svg) || CSS_URL_PATTERN.test(svg)) {
    return { ok: false, error: 'External SVG references are not allowed' }
  }

  return { ok: true, svg }
}
