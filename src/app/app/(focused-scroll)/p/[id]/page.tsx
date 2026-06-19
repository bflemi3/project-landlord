import { notFound } from 'next/navigation'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { getProperty } from '@/data/properties/server'
import { propertyQueryKey } from '@/data/properties/shared'
import { getMyPropertyRole } from '@/data/memberships/server'

import { LandlordPropertyView } from './landlord-property-view'
import { TenantPropertyView } from './tenant-property-view'
import { PropertyPageStoreProvider } from './state/provider'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const queryClient = new QueryClient()

  // One property fetch serves both the access gate and the header cache seed;
  // `React.cache()` collapses any repeat read this request into a single trip.
  const [property, role] = await Promise.all([getProperty(id), getMyPropertyRole(id)])
  if (!property || !role) notFound()

  queryClient.setQueryData(propertyQueryKey(id), property)

  return (
    <PropertyPageStoreProvider
      key={id}
      propertyId={id}
      defaultTab={role === 'landlord' ? 'revenue' : 'rent'}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        {role === 'landlord' ? (
          <LandlordPropertyView propertyId={id} />
        ) : (
          <TenantPropertyView propertyId={id} />
        )}
      </HydrationBoundary>
    </PropertyPageStoreProvider>
  )
}
