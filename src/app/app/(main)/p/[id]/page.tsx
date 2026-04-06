import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { fetchProperty, propertyQueryKey } from '@/lib/queries/property'
import { fetchUnit, unitQueryKey } from '@/lib/queries/unit'
import { fetchUnitCharges, unitChargesQueryKey } from '@/lib/queries/unit-charges'
import { fetchUnitTenants, unitTenantsQueryKey } from '@/lib/queries/unit-tenants'
import { fetchUnitInvites, unitInvitesQueryKey } from '@/lib/queries/unit-invites'
import { PropertyDetail } from './property-detail'

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const queryClient = new QueryClient()

  // Prefetch property and its units' data on the server
  const property = await queryClient.fetchQuery({
    queryKey: propertyQueryKey(id),
    queryFn: () => fetchProperty(supabase, id),
  })

  // Prefetch all unit data in parallel
  if (property) {
    await Promise.all(
      property.unitIds.flatMap((unitId) => [
        queryClient.prefetchQuery({
          queryKey: unitQueryKey(unitId),
          queryFn: () => fetchUnit(supabase, unitId),
        }),
        queryClient.prefetchQuery({
          queryKey: unitChargesQueryKey(unitId),
          queryFn: () => fetchUnitCharges(supabase, unitId),
        }),
        queryClient.prefetchQuery({
          queryKey: unitTenantsQueryKey(unitId),
          queryFn: () => fetchUnitTenants(supabase, unitId),
        }),
        queryClient.prefetchQuery({
          queryKey: unitInvitesQueryKey(unitId),
          queryFn: () => fetchUnitInvites(supabase, unitId),
        }),
      ]),
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FadeIn className="h-full">
        <PropertyDetail propertyId={id} />
      </FadeIn>
    </HydrationBoundary>
  )
}
