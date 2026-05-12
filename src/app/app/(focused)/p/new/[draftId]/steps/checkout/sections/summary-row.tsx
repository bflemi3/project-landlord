'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import type { SectionId } from '../../../state/registry'
import {
  useIsSectionActive,
  useIsSectionUpNext,
  usePropertyCreationActions,
  useSectionStatus,
  useSectionValidity,
} from '../../../state/use-property-creation'
import type { SectionValidity } from '../../../state/section-validity'
import { useCheckoutContext } from '../checkout-context'

// Mirror the colors used by `StepProgress` so the summary card and the
// top-of-page progress bar tell the same visual story. Active wins for the
// dot color regardless of the underlying validity — yelling "Needs attention"
// at the user while they're typing in that section is overkill; the dot
// reverts when they leave it.
const dotClasses: Record<SectionValidity, string> = {
  completed: 'bg-primary',
  skipped: 'bg-secondary',
  upcoming: 'bg-border',
  invalid: 'bg-destructive',
}

interface SummaryRowProps {
  detail?: string | null
  sectionId: SectionId
  title: string
}

export function SummaryRow({ detail, sectionId, title }: SummaryRowProps) {
  const { openSection } = usePropertyCreationActions()
  const { requestTransitionScroll } = useCheckoutContext()
  const t = useTranslations('propertyCreation.checkout.summary')
  const validity = useSectionValidity(sectionId)
  const isActive = useIsSectionActive(sectionId)
  // Mirror the accordion's lock rule: an upcoming section that isn't the
  // immediate up-next can't be jumped to from the summary either.
  const status = useSectionStatus(sectionId)
  const isUpNext = useIsSectionUpNext(sectionId)
  const isLockedUpcoming = status === 'upcoming' && !isActive && !isUpNext

  const dotClass = isActive ? 'bg-primary/50' : dotClasses[validity]
  const showDetail =
    validity === 'completed' && detail
      ? detail
      : validity === 'invalid'
        ? t('needsAttention')
        : null

  function handleClick() {
    if (isActive || isLockedUpcoming) return
    requestTransitionScroll()
    openSection(sectionId)
  }

  return (
    <li
      data-slot="checkout-summary-row"
      data-section-id={sectionId}
      data-status={validity}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isLockedUpcoming}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'flex w-full items-start gap-3 rounded-md py-1 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
          !isActive && !isLockedUpcoming && 'hover:text-foreground',
          isLockedUpcoming && 'cursor-default opacity-70',
        )}
      >
        <span
          data-status={validity}
          className={cn('mt-1.5 size-2 shrink-0 rounded-full', dotClass)}
        />
        <div className="flex-1">
          <span>{title}</span>
          {showDetail && (
            <p
              className={cn(
                'text-sm font-normal',
                validity === 'invalid'
                  ? 'text-destructive'
                  : 'text-muted-foreground/70',
              )}
            >
              {showDetail}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}
