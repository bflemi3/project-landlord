import { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
} from '@/components/detail-page-layout'
import { getProperty } from '@/data/properties/server'
import { HighlightWrapper } from './highlight-wrapper'
import { PropertyPageContent } from './property-page-content'
import { PropertyDetailSkeleton } from './sections/skeletons'

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
 * Property detail page — renders layout shell instantly, streams all content.
 */
export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <HighlightWrapper>
      <DetailPageLayout>
        <Suspense fallback={<PropertyDetailSkeleton />}>
          <PropertyPageContent propertyId={id} />
        </Suspense>
      </DetailPageLayout>
    </HighlightWrapper>
  )
}
