'use client'

import { cn } from '@/lib/utils'
import type { SectionId } from '../../../state/registry'
import {
  useIsSectionActive,
  useSectionStatus,
} from '../../../state/use-property-creation'
import type { SectionStatus } from '../../../state/persistence'

const dotClasses: Record<SectionStatus, string> = {
  completed: 'bg-success',
  skipped: 'bg-secondary',
  upcoming: 'bg-muted',
}

interface SummaryRowProps {
  sectionId: SectionId
  title: string
}

/**
 * Shared row primitive for the desktop summary panel. Per-section files
 * (`property.tsx`, etc.) export thin wrappers that bind their `sectionId`
 * + translated title and re-export under their own name. The wrapper is
 * what `CheckoutSummary` renders, so each section continues to own its own
 * panel-side surface even though the JSX lives here.
 */
export function SummaryRow({ sectionId, title }: SummaryRowProps) {
  const status = useSectionStatus(sectionId)
  const isActive = useIsSectionActive(sectionId)

  // Active beats `upcoming` so the currently-expanded section glows primary,
  // but never overrides `completed` / `skipped` — those carry their own
  // semantic color even when re-opened from the summary.
  const dotClass =
    isActive && status === 'upcoming' ? 'bg-primary' : dotClasses[status]

  return (
    <li
      data-slot="checkout-summary-row"
      data-section-id={sectionId}
      data-status={status}
      className={cn(
        'flex items-center gap-3',
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
      )}
    >
      <span
        data-status={status}
        className={cn('size-2 shrink-0 rounded-full', dotClass)}
      />
      <span className="flex-1">{title}</span>
    </li>
  )
}
