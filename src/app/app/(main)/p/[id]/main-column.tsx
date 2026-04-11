import { SuspenseFadeIn } from '@/components/suspense-fade-in'
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
 * then renders per-unit sections each streaming independently.
 */
export async function MainColumn({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId)

  return (
    <DetailPageLayoutMain>
      {property.unitIds.map((unitId) => (
        <SuspenseFadeIn key={`billing-${unitId}`} fallback={<BillingSummarySkeleton />}>
          <BillingSummaryCard unitId={unitId} propertyId={propertyId} />
        </SuspenseFadeIn>
      ))}

      {/* Mobile only: onboarding progress between summary and charges */}
      <div className="md:hidden">
        <SuspenseFadeIn fallback={<SetupProgressSkeleton />}>
          <SetupProgressSection propertyId={propertyId} />
        </SuspenseFadeIn>
      </div>

      {property.unitIds.map((unitId) => (
        <SuspenseFadeIn key={unitId} fallback={<UnitSectionSkeleton />}>
          <UnitSection unitId={unitId} propertyId={propertyId} />
        </SuspenseFadeIn>
      ))}
    </DetailPageLayoutMain>
  )
}
