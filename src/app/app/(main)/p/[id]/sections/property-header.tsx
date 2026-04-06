'use client'

import { useTranslations } from 'next-intl'
import { useProperty } from '@/lib/hooks/use-property'
import { useUnit } from '@/lib/hooks/use-unit'
import { useUnitCharges } from '@/lib/hooks/use-unit-charges'
import { formatCurrency } from '@/lib/format-currency'

export function PropertyHeader({ propertyId }: { propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const { data: property } = useProperty(propertyId)
  const firstUnitId = property.unitIds[0] ?? ''
  const { data: unit } = useUnit(firstUnitId)
  const { data: charges } = useUnitCharges(firstUnitId)

  const estimatedRevenue = charges
    .filter((c) => c.chargeType !== 'variable' && c.amountMinor)
    .reduce((sum, c) => sum + (c.amountMinor ?? 0), 0)

  const variableChargeCount = charges.filter((c) => c.chargeType === 'variable').length

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const cityState = [property.city, property.state].filter(Boolean).join(', ')

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
      {(address || cityState) && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[address, cityState].filter(Boolean).join(', ')}
        </p>
      )}

      {estimatedRevenue > 0 && (
        <p className="mt-2 text-lg tabular-nums text-muted-foreground">
          <span className="font-bold text-foreground">
            {formatCurrency(estimatedRevenue, unit.currency)}
          </span>
          {' '}{t('estimated')}
          {variableChargeCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {' · '}{t('variableCharges', { count: variableChargeCount })}
            </span>
          )}
        </p>
      )}
    </>
  )
}
