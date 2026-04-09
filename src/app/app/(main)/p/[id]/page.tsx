import type { Metadata } from 'next'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { propertyQueryKey } from '@/data/properties/shared'
import { getProperty } from '@/lib/queries/server'
import {
  fetchUnit, unitQueryKey,
  fetchUnitCharges, unitChargesQueryKey,
  fetchUnitTenants, unitTenantsQueryKey,
  fetchUnitInvites, unitInvitesQueryKey,
  fetchUnitStatements, unitStatementsQueryKey,
} from '@/data/units/shared'
import { fetchMissingCharges, missingChargesQueryKey } from '@/lib/queries/missing-charges'
import { PropertyDetail } from './property-detail'

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
  const supabase = await createClient()
  const queryClient = new QueryClient()

  // Fetch property via React.cache (shared with generateMetadata)
  const property = await getProperty(id)
  queryClient.setQueryData(propertyQueryKey(id), property)

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
