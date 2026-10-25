import { cn } from '@/lib/utils/cn'

type TapeTone = 'masking' | 'clear'

const TONE_BG: Record<TapeTone, string> = {
  masking: 'rgba(228, 200, 120, 0.55)',
  clear: 'rgba(250, 247, 240, 0.45)',
}

/** Torn left/right ends, slightly uneven top/bottom. */
const TORN_CLIP =
  'polygon(2% 0%, 98% 2%, 100% 16%, 99% 34%, 100% 54%, 98% 74%, 100% 90%, 97% 100%, 3% 98%, 0% 84%, 1% 62%, 0% 40%, 1% 18%)'

interface TapeStripProps {
  tone?: TapeTone
  rotation?: number
  width?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * A strip of tape. Pure CSS — no asset. Sits across corners of cut-outs,
 * notes and the table edge. Low-velocity: it appears, it never bounces.
 */
export default function TapeStrip({
  tone = 'masking',
  rotation = -3,
  width = 72,
  className,
  style,
}: TapeStripProps) {
  return (
    <span
      aria-hidden
      className={cn('block h-[22px] pointer-events-none', className)}
      style={{
        width,
        background: TONE_BG[tone],
        clipPath: TORN_CLIP,
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 3px, rgba(255,255,255,0) 3px 9px)',
        boxShadow: '0 1px 2px rgba(25, 20, 16, 0.10)',
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
    />
  )
}
