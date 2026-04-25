'use client'

import {
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IconTile } from '@/components/icon-tile'
import {
  CHECKOUT_SECTIONS,
  FIRST_SECTION_ID,
  type CheckoutSection,
} from '../../state/registry'

function SectionSkeleton({
  section,
  active,
}: {
  section: CheckoutSection
  active: boolean
}) {
  const Icon = section.icon
  return (
    <Card
      size="md"
      data-slot="checkout-section-skeleton"
      data-section-id={section.id}
      data-active={active ? 'true' : 'false'}
      className="flex items-start gap-4"
    >
      <IconTile tone={active ? 'primary' : 'muted'} size="lg">
        <Icon />
      </IconTile>
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-56 rounded-full" />
      </div>
    </Card>
  )
}

/**
 * The full Step-2-matching skeleton: six stacked section skeletons in the main
 * column (first section rendered as active to match Step 2's initial
 * SectionShell tone), a summary-panel skeleton in the sidebar, and a mobile
 * bottom-bar skeleton. Rendered by Step 1 during extraction — layout parity
 * with Step 2 keeps the visual transition from skeleton to real content
 * seamless.
 */
export function StepOneSkeletonLayout() {
  return (
    <DetailPageLayoutBody
      data-slot="step-one-skeleton-layout"
      className="mt-8 md:mt-6"
    >
      <DetailPageLayoutMain>
        <div className="flex flex-col gap-4 md:gap-6">
          {CHECKOUT_SECTIONS.map((s) => (
            <SectionSkeleton
              key={s.id}
              section={s}
              active={s.id === FIRST_SECTION_ID}
            />
          ))}
        </div>
      </DetailPageLayoutMain>

      <DetailPageLayoutSidebar className="md:sticky md:top-6">
        <div
          data-slot="step-one-summary-skeleton"
          className="hidden rounded-card border border-transparent bg-card p-6 shadow-lg dark:border-border dark:shadow-none md:flex md:flex-col md:gap-6"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-3 w-48 rounded-full" />
          </div>
          <div className="space-y-3">
            {CHECKOUT_SECTIONS.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton className="h-3 flex-1 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-auto h-12 w-full rounded-full" />
        </div>
      </DetailPageLayoutSidebar>

      <div
        data-slot="step-one-mobile-bottom-skeleton"
        className="sticky bottom-0 -mx-6 mt-6 shrink-0 border-t border-border bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          {CHECKOUT_SECTIONS.map((s) => (
            <Skeleton key={s.id} className="size-2 rounded-full" />
          ))}
        </div>
        <div className="mb-3 flex justify-center">
          <Skeleton className="h-5 w-40 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </DetailPageLayoutBody>
  )
}
