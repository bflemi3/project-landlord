import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProperty } from '@/data/properties/server'
import { getUnitTenants, getUnitInvites } from '@/data/units/server'
import { unitTenantsQueryKey, unitInvitesQueryKey } from '@/data/units/shared'
import { propertyQueryKey } from '@/data/properties/shared'
import { TenantsSection } from './tenants-section'

/**
 * Server wrapper that prefetches data for TenantsSection (client component).
 * Dehydrates into HydrationBoundary so useSuspenseQuery resolves during SSR.
 */
export async function TenantsSectionWrapper({ propertyId, unitId }: { propertyId: string; unitId: string }) {
  const queryClient = new QueryClient()

  const [property, members, invites] = await Promise.all([
    getProperty(propertyId),
    getUnitTenants(unitId),
    getUnitInvites(unitId),
  ])

  queryClient.setQueryData(propertyQueryKey(propertyId), property)
  queryClient.setQueryData(unitTenantsQueryKey(unitId), members)
  queryClient.setQueryData(unitInvitesQueryKey(unitId), invites)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TenantsSection propertyId={propertyId} unitId={unitId} />
    </HydrationBoundary>
  )
}
