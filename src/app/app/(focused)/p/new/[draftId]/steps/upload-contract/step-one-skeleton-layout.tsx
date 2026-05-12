'use client'

import {
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { CHECKOUT_SECTIONS } from '../../state/registry'
import { PropertySectionSkeleton } from '../checkout/sections/property'
import { RentDatesSectionSkeleton } from '../checkout/sections/rent-dates'
import { TenantsSectionSkeleton } from '../checkout/sections/tenants'
import { ExpensesSectionSkeleton } from '../checkout/sections/expenses'
import { TaxIdSectionSkeleton } from '../checkout/sections/tax-id'
import { BankSectionSkeleton } from '../checkout/sections/bank'

/**
 * Full Step-2-matching skeleton: each accordion section composes its own
 * `*SectionSkeleton` so future per-section plans only need to update their
 * own file when the real form layout changes — this layout picks the new
 * skeleton up automatically. The first section renders in `active` tone to
 * mirror Step 2's initial state.
 *
 * Rendered by Step 1 during contract extraction and by the route's hydration
 * gate, so the visual transition into Step 2 is seamless.
 */
export function StepOneSkeletonLayout() {
  return (
    <DetailPageLayoutBody
      data-slot="step-one-skeleton-layout"
      className="mt-8 md:mt-6"
    >
      <DetailPageLayoutMain>
        <div className="flex flex-col gap-4 md:gap-6">
          <PropertySectionSkeleton active />
          <RentDatesSectionSkeleton />
          <TenantsSectionSkeleton />
          <ExpensesSectionSkeleton />
          <TaxIdSectionSkeleton />
          <BankSectionSkeleton />
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
