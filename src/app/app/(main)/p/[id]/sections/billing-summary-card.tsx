import { getLocale } from 'next-intl/server'
import { getUnit, getUnitRent, getUnitCharges, getUnitStatements } from '@/data/units/server'
import { getCurrentPeriod, formatPeriod, getStatementUrgency, getDaysUntilPublishBy } from '@/lib/statement-urgency'
import { computeFinancialSummary } from '@/lib/statements/financial-summary'
import { BillingSummaryCardClient } from './billing-summary-card-client'

export async function BillingSummaryCard({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const locale = await getLocale()
  const [unit, rent, charges, statements] = await Promise.all([
    getUnit(unitId),
    getUnitRent(unitId),
    getUnitCharges(unitId),
    getUnitStatements(unitId),
  ])

  const { year, month } = getCurrentPeriod()
  const periodLabel = formatPeriod(year, month, locale)
  const { tenantTotal, total, source } = computeFinancialSummary(statements, charges, year, month)

  const currentStatement = statements.find(
    (s) => s.periodYear === year && s.periodMonth === month,
  )

  // Due day comes from the unit's active rent row. When no rent row exists
  // yet, downstream UI hides the "due monthly" line and skips urgency
  // rendering — no fake fallback number.
  const dueDay = rent?.dueDayOfMonth ?? null
  const urgency = dueDay != null ? getStatementUrgency(dueDay, year, month) : null
  const daysUntil = dueDay != null ? getDaysUntilPublishBy(dueDay, year, month) : null
  const isEstimate = source !== 'statement'

  // Don't show the card if there are no charges configured
  if (total === 0 && !currentStatement) return null

  return (
    <BillingSummaryCardClient
      unitId={unitId}
      propertyId={propertyId}
      currency={unit.currency}
      dueDay={dueDay}
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
