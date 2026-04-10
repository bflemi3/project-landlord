import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FadeIn } from '@/components/fade-in'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
} from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { HighlightWrapper } from './highlight-wrapper'
import { PropertyHeader } from './sections/property-header'
import { MainColumn } from './main-column'
import { Sidebar } from './sidebar'
import { HeaderSkeleton, MainColumnSkeleton, SidebarSkeleton } from './sections/skeletons'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const property = await getProperty(id)
    return { title: property.name }
  } catch {
    return { title: 'Property' }
  }
}

/**
 * Property detail page — synchronous, no blocking awaits.
 *
 * Header streams independently (fetches property for name/address).
 * MainColumn and Sidebar call cached getProperty() for unitIds (instant
 * if header already fetched via React.cache). Sections within each
 * stream independently via their own Suspense boundaries.
 */
export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <HighlightWrapper>
      <DetailPageLayout>
        <DetailPageLayoutHeader>
          <Suspense fallback={<HeaderSkeleton />}>
            <FadeIn>
              <PropertyHeader propertyId={id} />
            </FadeIn>
          </Suspense>
        </DetailPageLayoutHeader>

        <DetailPageLayoutBody>
          <Suspense fallback={<MainColumnSkeleton />}>
            <MainColumn propertyId={id} />
          </Suspense>
          <Suspense fallback={<SidebarSkeleton />}>
            <Sidebar propertyId={id} />
          </Suspense>
        </DetailPageLayoutBody>
      </DetailPageLayout>
    </HighlightWrapper>
  )
}
