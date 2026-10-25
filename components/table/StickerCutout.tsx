import { cn } from '@/lib/utils/cn'

type CutoutRadius = 'blob' | 'round' | 'sharp'

const RADIUS: Record<CutoutRadius, string> = {
  blob: '10px 14px 9px 13px / 13px 9px 14px 10px',
  round: '9999px',
  sharp: '2px',
}

interface StickerCutoutProps {
  radius?: CutoutRadius
  /** white die-cut border thickness, px */
  padding?: number
  rotation?: number
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

/**
 * The core cut-out primitive: a white die-cut border + hard paper shadow
 * around any content. This single device carries the whole "sticker" world —
 * heads, stickers, notes, mini shirts all sit inside one of these.
 */
export default function StickerCutout({
  radius = 'blob',
  padding = 6,
  rotation = 0,
  className,
  style,
  children,
}: StickerCutoutProps) {
  return (
    <div
      className={cn(
        'inline-block bg-craft-cotton shadow-cutout ring-1 ring-[rgba(25,20,16,0.06)]',
        className,
      )}
      style={{
        padding,
        borderRadius: RADIUS[radius],
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
