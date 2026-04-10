'use client'

import { useSearchParams } from 'next/navigation'
import { UrgentActionList } from '@/components/urgent-action-list'
import { URGENT_ACTION_VARIANTS } from '@/app/preview/component-data'

export function FrameContent() {
  const searchParams = useSearchParams()
  const index = Number(searchParams.get('index') ?? 0)
  const variant = URGENT_ACTION_VARIANTS[index]

  if (!variant) return <p className="p-4 text-sm text-muted-foreground">Unknown variant</p>

  return (
    <div className="p-6">
      <UrgentActionList urgentActions={variant.actions} />
    </div>
  )
}
