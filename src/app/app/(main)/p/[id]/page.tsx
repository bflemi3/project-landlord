import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { fetchProperty, propertyQueryKey } from '@/lib/queries/property'
import { fetchUnit, unitQueryKey } from '@/lib/queries/unit'
import { fetchUnitCharges, unitChargesQueryKey } from '@/lib/queries/unit-charges'
import { fetchUnitTenants, unitTenantsQueryKey } from '@/lib/queries/unit-tenants'
import { fetchUnitInvites, unitInvitesQueryKey } from '@/lib/queries/unit-invites'
import { fetchUnitStatements, unitStatementsQueryKey } from '@/lib/queries/unit-statements'
import { fetchMissingCharges, missingChargesQueryKey } from '@/lib/queries/missing-charges'
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
        queryClient.prefetchQuery({
          queryKey: unitStatementsQueryKey(unitId),
          queryFn: () => fetchUnitStatements(supabase, unitId),
        }),
      ]),
    )

    // Prefetch missing charges for each unit's current-period draft statement
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    await Promise.all(
      property.unitIds.map(async (unitId) => {
        const statements = queryClient.getQueryData<{ id: string; periodYear: number; periodMonth: number }[]>(
          unitStatementsQueryKey(unitId),
        )
        const current = statements?.find(
          (s) => s.periodYear === currentYear && s.periodMonth === currentMonth,
        )
        if (current) {
          await queryClient.prefetchQuery({
            queryKey: missingChargesQueryKey(unitId, current.id),
            queryFn: () => fetchMissingCharges(supabase, unitId, current.id, currentYear, currentMonth),
          })
        }
      }),
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
