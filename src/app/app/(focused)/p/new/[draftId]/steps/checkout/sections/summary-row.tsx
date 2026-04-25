'use client'

import { cn } from '@/lib/utils'
import { usePropertyCreationState } from '../../../state/use-property-creation'
import type { SectionId } from '../../../state/registry'

interface SummaryRowProps {
  sectionId: SectionId
  title: string
}

export function SummaryRow({ sectionId, title }: SummaryRowProps) {
  const status = usePropertyCreationState((s) => s.sectionStates[sectionId])
  const isActive = usePropertyCreationState(
    (s) => s.activeSectionId === sectionId,
  )

  const dotClass =
    status === 'completed'
      ? 'size-2 shrink-0 rounded-full bg-success'
      : status === 'skipped'
        ? 'size-2 shrink-0 rounded-full bg-secondary'
        : isActive
          ? 'size-2 shrink-0 rounded-full bg-primary'
          : 'size-2 shrink-0 rounded-full bg-muted'

  return (
    <li
      data-slot="checkout-summary-row"
      data-section-id={sectionId}
      data-status={status}
      className={cn(
        'flex items-center gap-3',
        isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
      )}
    >
      <span data-status={status} className={dotClass} />
      <span className="flex-1">{title}</span>
    </li>
  )
}
