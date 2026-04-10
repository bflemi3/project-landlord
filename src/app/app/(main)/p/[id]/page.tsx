import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { FadeIn } from '@/components/fade-in'
import { PageHeader, PageHeaderBack } from '@/components/page-header'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { HighlightWrapper } from './highlight-wrapper'
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const property = await getProperty(id)
    return { title: property.name }
  } catch {
    return { title: 'Property' }
  }
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('propertyDetail')

  // Fetch property to get unitIds for the loops below
  const property = await getProperty(id)

  return (
    <HighlightWrapper>
      <DetailPageLayout>
        <DetailPageLayoutHeader>
          <PageHeader>
            <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
            <PropertyHeader propertyId={id} />
          </PageHeader>
        </DetailPageLayoutHeader>

        <DetailPageLayoutBody>
          <DetailPageLayoutMain>
            {property.unitIds.map((unitId) => (
              <Suspense key={`billing-${unitId}`} fallback={<BillingSummarySkeleton />}>
                <FadeIn>
                  <BillingSummaryCard unitId={unitId} propertyId={id} />
                </FadeIn>
              </Suspense>
            ))}

            {/* Mobile only: onboarding progress between summary and charges */}
            <div className="md:hidden">
              <Suspense fallback={<SetupProgressSkeleton />}>
                <FadeIn>
                  <SetupProgressSection propertyId={id} />
                </FadeIn>
              </Suspense>
            </div>

            {property.unitIds.map((unitId) => (
              <Suspense key={unitId} fallback={<UnitSectionSkeleton />}>
                <FadeIn>
                  <UnitSection unitId={unitId} propertyId={id} />
                </FadeIn>
              </Suspense>
            ))}
          </DetailPageLayoutMain>

          <DetailPageLayoutSidebar>
            {/* Desktop only: onboarding progress in sidebar */}
            <div className="hidden md:block">
              <Suspense fallback={<SetupProgressSkeleton />}>
                <FadeIn>
                  <SetupProgressSection propertyId={id} />
                </FadeIn>
              </Suspense>
            </div>

            <FadeIn>
              <PropertyInfoSection propertyId={id} />
            </FadeIn>

            {property.unitIds.map((unitId) => (
              <Suspense key={unitId} fallback={<TenantsSkeleton />}>
                <FadeIn>
                  <TenantsSection propertyId={id} unitId={unitId} />
                </FadeIn>
              </Suspense>
            ))}
          </DetailPageLayoutSidebar>
        </DetailPageLayoutBody>
      </DetailPageLayout>
    </HighlightWrapper>
  )
}
