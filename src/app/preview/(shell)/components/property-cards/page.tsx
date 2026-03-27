'use client'

import { ComponentPreview } from '@/app/preview/(shell)/components/component-preview'
import { OPERATING_VARIANTS, SETUP_VARIANTS } from '@/app/preview/component-data'

export default function PropertyCardsPreview() {
  const variants = [
    ...OPERATING_VARIANTS.map((v, i) => ({
      label: `Operating — ${v.label}`,
      frameUrl: `/preview/components/property-cards/frame?type=operating&index=${i}`,
      height: 160,
    })),
    ...SETUP_VARIANTS.map((v, i) => ({
      label: `Setup — ${v.label}`,
      frameUrl: `/preview/components/property-cards/frame?type=setup&index=${i}`,
      height: 260,
    })),
  ]

  return (
    <ComponentPreview
      title="Property cards"
      description="Operating and setup state variants"
      variants={variants}
    />
  )
}
