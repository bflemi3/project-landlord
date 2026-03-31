'use client'

import { ComponentPreview } from '@/app/preview/(shell)/components/component-preview'
import { URGENT_ACTION_VARIANTS } from '@/app/preview/component-data'

export default function UrgentActionsPreview() {
  const variants = URGENT_ACTION_VARIANTS.map((v, i) => ({
    label: v.label,
    frameUrl: `/preview/components/urgent-actions/frame?index=${i}`,
    height: v.actions.length * 72 + 48,
  }))

  return (
    <ComponentPreview
      title="Urgent actions"
      description="Action row variants for overdue, claims, disputes, and reviews"
      variants={variants}
    />
  )
}
