'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useProperty } from '@/data/properties/client'
import { HighlightProvider } from '@/lib/hooks/use-highlight-target'
import { PageHeader, PageHeaderBack } from '@/components/page-header'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { PropertyHeader } from './sections/property-header'
import { BillingSummaryCard } from './sections/billing-summary-card'
import { SetupProgressSection } from './sections/setup-progress-section'
import { UnitSection } from './sections/unit-section'
import { PropertyInfoSection } from './sections/property-info-section'
import { TenantsSection } from './sections/tenants-section'

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const { data: property } = useProperty(propertyId)
  const searchParams = useSearchParams()
  const router = useRouter()

  const highlightTarget = searchParams.get('highlight')

  // Clear the param from the URL so refresh doesn't re-trigger
  useEffect(() => {
    if (!highlightTarget) return
    const url = new URL(window.location.href)
    url.searchParams.delete('highlight')
    router.replace(url.pathname + url.search, { scroll: false })
  }, [highlightTarget, router])

  return (
    <HighlightProvider value={highlightTarget}>
      <DetailPageLayout>
        <DetailPageLayoutHeader>
          <PageHeader>
            <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
            <PropertyHeader propertyId={propertyId} />
          </PageHeader>
        </DetailPageLayoutHeader>

        <DetailPageLayoutBody>
          <DetailPageLayoutMain>
            {property.unitIds.map((unitId) => (
              <BillingSummaryCard key={`billing-${unitId}`} unitId={unitId} propertyId={propertyId} />
            ))}

            {/* Mobile only: onboarding progress between summary and charges */}
            <div className="md:hidden">
              <SetupProgressSection propertyId={propertyId} />
            </div>

            {property.unitIds.map((unitId) => (
              <UnitSection key={unitId} unitId={unitId} propertyId={propertyId} />
            ))}
          </DetailPageLayoutMain>

          <DetailPageLayoutSidebar>
            {/* Desktop only: onboarding progress in sidebar */}
            <div className="hidden md:block">
              <SetupProgressSection propertyId={propertyId} />
            </div>
            <PropertyInfoSection propertyId={propertyId} />

            {property.unitIds.map((unitId) => (
              <TenantsSection key={unitId} propertyId={propertyId} unitId={unitId} />
            ))}
          </DetailPageLayoutSidebar>
        </DetailPageLayoutBody>
      </DetailPageLayout>
    </HighlightProvider>
  )
}
