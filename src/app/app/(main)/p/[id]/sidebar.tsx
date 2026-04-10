import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'
import { DetailPageLayoutSidebar } from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { SetupProgressSection } from './sections/setup-progress-section'
import { PropertyInfoSection } from './sections/property-info-section'
import { TenantsSection } from './sections/tenants-section'
import {
  SetupProgressSkeleton,
  TenantsSkeleton,
} from './sections/skeletons'

/**
 * Sidebar — calls cached getProperty() for unitIds (instant if already fetched),
 * then renders sections each in their own Suspense + FadeIn.
 */
export async function Sidebar({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId)

  return (
    <DetailPageLayoutSidebar>
      {/* Desktop only: onboarding progress in sidebar */}
      <div className="hidden md:block">
        <Suspense fallback={<SetupProgressSkeleton />}>
          <FadeIn>
            <SetupProgressSection propertyId={propertyId} />
          </FadeIn>
        </Suspense>
      </div>

      <FadeIn>
        <PropertyInfoSection propertyId={propertyId} />
      </FadeIn>

      {property.unitIds.map((unitId) => (
        <Suspense key={unitId} fallback={<TenantsSkeleton />}>
          <FadeIn>
            <TenantsSection propertyId={propertyId} unitId={unitId} />
          </FadeIn>
        </Suspense>
      ))}
    </DetailPageLayoutSidebar>
  )
}
