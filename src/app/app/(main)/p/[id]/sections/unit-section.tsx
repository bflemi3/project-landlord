import { getProperty } from '@/data/properties/server'
import { getUnit } from '@/data/units/server'
import { ChargesSection } from './charges-section'

export async function UnitSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  // Both calls use React.cache() — getProperty() resolves from cache (already fetched by MainColumn)
  const [property, unit] = await Promise.all([
    getProperty(propertyId),
    getUnit(unitId),
  ])
  const showUnitHeader = property.unitIds.length > 1

  return (
    <div>
      {showUnitHeader && (
        <h2 className="mb-4 text-lg font-semibold text-foreground">{unit.name}</h2>
      )}
      <ChargesSection unitId={unitId} propertyId={propertyId} />
    </div>
  )
}
