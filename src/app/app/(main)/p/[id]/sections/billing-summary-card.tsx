import { getLocale } from 'next-intl/server'
import { getUnit, getUnitCharges, getUnitStatements } from '@/data/units/server'
import { getCurrentPeriod, formatPeriod, getStatementUrgency, getDaysUntilPublishBy } from '@/lib/statement-urgency'
import { computeFinancialSummary } from '@/lib/statements/financial-summary'
import { BillingSummaryCardClient } from './billing-summary-card-client'

export async function BillingSummaryCard({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const locale = await getLocale()
  const [unit, charges, statements] = await Promise.all([
    getUnit(unitId),
    getUnitCharges(unitId),
    getUnitStatements(unitId),
  ])

  const { year, month } = getCurrentPeriod()
  const periodLabel = formatPeriod(year, month, locale)
  const { tenantTotal, total, source } = computeFinancialSummary(statements, charges, year, month)

  const currentStatement = statements.find(
    (s) => s.periodYear === year && s.periodMonth === month,
  )

  const urgency = getStatementUrgency(unit.dueDay, year, month)
  const daysUntil = getDaysUntilPublishBy(unit.dueDay, year, month)
  const isEstimate = source !== 'statement'

  // Don't show the card if there are no charges configured
  if (total === 0 && !currentStatement) return null

  return (
    <BillingSummaryCardClient
      unitId={unitId}
      propertyId={propertyId}
      currency={unit.currency}
      dueDay={unit.dueDay}
      tenantTotal={tenantTotal}
      isEstimate={isEstimate}
      periodLabel={periodLabel}
      urgency={urgency}
      daysUntil={daysUntil}
      year={year}
      month={month}
      currentStatement={currentStatement ? {
        id: currentStatement.id,
        tenantTotalMinor: currentStatement.tenantTotalMinor,
      } : null}
    />
  )
}
