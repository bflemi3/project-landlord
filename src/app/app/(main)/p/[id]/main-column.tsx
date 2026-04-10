import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'
import { DetailPageLayoutMain } from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { BillingSummaryCard } from './sections/billing-summary-card'
import { SetupProgressSection } from './sections/setup-progress-section'
import { UnitSection } from './sections/unit-section'
import {
  BillingSummarySkeleton,
  UnitSectionSkeleton,
  SetupProgressSkeleton,
} from './sections/skeletons'

/**
 * Main column — calls cached getProperty() for unitIds (instant if header already fetched),
 * then renders per-unit sections each in their own Suspense + FadeIn.
 */
export async function MainColumn({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId)

  return (
    <DetailPageLayoutMain>
      {property.unitIds.map((unitId) => (
        <Suspense key={`billing-${unitId}`} fallback={<BillingSummarySkeleton />}>
          <FadeIn>
            <BillingSummaryCard unitId={unitId} propertyId={propertyId} />
          </FadeIn>
        </Suspense>
      ))}

      {/* Mobile only: onboarding progress between summary and charges */}
      <div className="md:hidden">
        <Suspense fallback={<SetupProgressSkeleton />}>
          <FadeIn>
            <SetupProgressSection propertyId={propertyId} />
          </FadeIn>
        </Suspense>
      </div>

      {property.unitIds.map((unitId) => (
        <Suspense key={unitId} fallback={<UnitSectionSkeleton />}>
          <FadeIn>
            <UnitSection unitId={unitId} propertyId={propertyId} />
          </FadeIn>
        </Suspense>
      ))}
    </DetailPageLayoutMain>
  )
}
