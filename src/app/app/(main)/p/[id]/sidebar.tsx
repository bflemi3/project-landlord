import { FadeIn } from '@/components/fade-in'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { DetailPageLayoutSidebar } from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { SetupProgressSection } from './sections/setup-progress-section'
import { PropertyInfoSection } from './sections/property-info-section'
import { TenantsSectionWrapper } from './sections/tenants-section-wrapper'
import {
  SetupProgressSkeleton,
  TenantsSkeleton,
} from './sections/skeletons'

/**
 * Sidebar — calls cached getProperty() for unitIds (instant if already fetched),
 * then renders sections each streaming independently.
 */
export async function Sidebar({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId)

  return (
    <DetailPageLayoutSidebar>
      {/* Desktop only: onboarding progress in sidebar */}
      <div className="hidden md:block">
        <SuspenseFadeIn fallback={<SetupProgressSkeleton />}>
          <SetupProgressSection propertyId={propertyId} />
        </SuspenseFadeIn>
      </div>

      <FadeIn>
        <PropertyInfoSection propertyId={propertyId} />
      </FadeIn>

      {property.unitIds.map((unitId) => (
        <SuspenseFadeIn key={unitId} fallback={<TenantsSkeleton />}>
          <TenantsSectionWrapper propertyId={propertyId} unitId={unitId} />
        </SuspenseFadeIn>
      ))}
    </DetailPageLayoutSidebar>
  )
}
