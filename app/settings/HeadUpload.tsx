'use client'

import HeadCropUpload from '@/components/avatar/HeadCropUpload'

interface Props {
  side: 'front' | 'back'
  currentUrl: string | null
}

export default function HeadUpload({ side, currentUrl }: Props) {
  return <HeadCropUpload side={side} currentUrl={currentUrl} />
}
