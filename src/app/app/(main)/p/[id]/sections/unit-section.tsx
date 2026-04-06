'use client'

import { useProperty } from '@/lib/hooks/use-property'
import { useUnit } from '@/lib/hooks/use-unit'
import { ChargesSection } from './charges-section'

export function UnitSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const { data: property } = useProperty(propertyId)
  const { data: unit } = useUnit(unitId)
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
