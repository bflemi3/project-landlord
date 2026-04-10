import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { FadeIn } from '@/components/fade-in'
import { PageHeader, PageHeaderBack } from '@/components/page-header'
import {
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { PropertyHeader } from './sections/property-header'
import { BillingSummaryCard } from './sections/billing-summary-card'
import { SetupProgressSection } from './sections/setup-progress-section'
import { UnitSection } from './sections/unit-section'
import { PropertyInfoSection } from './sections/property-info-section'
import { TenantsSection } from './sections/tenants-section'
import {
  BillingSummarySkeleton,
  UnitSectionSkeleton,
  TenantsSkeleton,
  SetupProgressSkeleton,
} from './sections/skeletons'

/**
 * Property page content — fetches property + translations, renders header + body.
 * Wrapped in Suspense by the parent page. Sections within stream independently.
 */
export async function PropertyPageContent({ propertyId }: { propertyId: string }) {
  const [property, t] = await Promise.all([
    getProperty(propertyId),
    getTranslations('propertyDetail'),
  ])

  return (
    <FadeIn>
      <DetailPageLayoutHeader>
        <PageHeader>
          <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
          <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
          {(() => {
            const address = [property.street, property.number].filter(Boolean).join(', ')
            const cityState = [property.city, property.state].filter(Boolean).join(', ')
            const full = [address, cityState].filter(Boolean).join(', ')
            return full ? <p className="mt-0.5 text-sm text-muted-foreground">{full}</p> : null
          })()}
        </PageHeader>
      </DetailPageLayoutHeader>

      <DetailPageLayoutBody>
        <DetailPageLayoutMain>
          {property.unitIds.map((unitId) => (
            <Suspense key={`billing-${unitId}`} fallback={<BillingSummarySkeleton />}>
              <FadeIn>
                <BillingSummaryCard unitId={unitId} propertyId={propertyId} />
              </FadeIn>
            </Suspense>
          ))}

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

        <DetailPageLayoutSidebar>
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
      </DetailPageLayoutBody>
    </FadeIn>
  )
}
