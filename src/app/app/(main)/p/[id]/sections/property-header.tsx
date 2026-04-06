'use client'

import { useTranslations } from 'next-intl'
import { useProperty } from '@/lib/hooks/use-property'
import { useUnit } from '@/lib/hooks/use-unit'
import { useUnitCharges } from '@/lib/hooks/use-unit-charges'
import { useUnitStatements } from '@/lib/hooks/use-unit-statements'
import { formatCurrency } from '@/lib/format-currency'
import { getCurrentPeriod } from '@/lib/statement-urgency'
import { computeFinancialSummary } from '@/lib/statements/financial-summary'

export function PropertyHeader({ propertyId }: { propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const { data: property } = useProperty(propertyId)
  const firstUnitId = property.unitIds[0] ?? ''
  const { data: unit } = useUnit(firstUnitId)
  const { data: charges } = useUnitCharges(firstUnitId)
  const { data: statements } = useUnitStatements(firstUnitId)

  const { year, month } = getCurrentPeriod()
  const { tenantTotal, landlordTotal, total, source } = computeFinancialSummary(
    statements, charges, year, month,
  )

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const cityState = [property.city, property.state].filter(Boolean).join(', ')
  const isEstimate = source !== 'statement'

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
      {(address || cityState) && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[address, cityState].filter(Boolean).join(', ')}
        </p>
      )}

      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(tenantTotal, unit.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              {isEstimate ? t('estimated') + ' ' : ''}tenant owes
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {landlordTotal > 0 && (
              <>
                <span>You cover {formatCurrency(landlordTotal, unit.currency)}</span>
                <span>·</span>
              </>
            )}
            <span>Total {formatCurrency(total, unit.currency)}</span>
            <span>·</span>
            <span>Due the {unit.dueDay}{getOrdinalSuffix(unit.dueDay)}</span>
          </div>
        </div>
      )}
    </>
  )
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
