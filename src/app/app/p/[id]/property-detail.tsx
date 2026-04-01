'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useProperty } from '@/lib/hooks/use-property'
import { HighlightProvider } from '@/lib/hooks/use-highlight-target'
import { PageHeader, PageHeaderBack } from '@/components/page-header'
import { PropertyHeader } from './sections/property-header'
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
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className="mx-auto max-w-4xl">
          <PageHeader>
            <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
            <PropertyHeader propertyId={propertyId} />
          </PageHeader>

          <SetupProgressSection propertyId={propertyId} />

          <div className="mt-8 md:flex md:gap-8">
            <div className="flex-1 space-y-8">
              {property.unitIds.map((unitId) => (
                <UnitSection key={unitId} unitId={unitId} propertyId={propertyId} />
              ))}
            </div>

            <div className="mt-8 space-y-8 md:mt-0 md:w-96 md:shrink-0">
              <PropertyInfoSection propertyId={propertyId} />

              {property.unitIds.map((unitId) => (
                <TenantsSection key={unitId} propertyId={propertyId} unitId={unitId} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </HighlightProvider>
  )
}
