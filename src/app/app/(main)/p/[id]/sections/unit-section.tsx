import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProperty } from '@/data/properties/server'
import { getUnit, getUnitCharges } from '@/data/units/server'
import { unitQueryKey, unitChargesQueryKey } from '@/data/units/shared'
import { ChargesSection } from './charges-section'

export async function UnitSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const queryClient = new QueryClient()

  // Prefetch data that ChargesSection's client hooks need
  const [property, unit, charges] = await Promise.all([
    getProperty(propertyId),
    getUnit(unitId),
    getUnitCharges(unitId),
  ])

  queryClient.setQueryData(unitQueryKey(unitId), unit)
  queryClient.setQueryData(unitChargesQueryKey(unitId), charges)

  const showUnitHeader = property.unitIds.length > 1

  return (
    <div>
      {showUnitHeader && (
        <h2 className="mb-4 text-lg font-semibold text-foreground">{unit.name}</h2>
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ChargesSection unitId={unitId} propertyId={propertyId} />
      </HydrationBoundary>
    </div>
  )
}
