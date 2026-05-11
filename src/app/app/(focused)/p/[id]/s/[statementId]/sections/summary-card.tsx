import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import { getStatement, getMissingCharges } from '@/data/statements/server'
import { getUnitRent } from '@/data/units/server'
import { formatCurrency } from '@/lib/format-currency'
import { Separator } from '@/components/ui/separator'
import { getStatementUrgency, getDaysUntilPublishBy, getPublishByDay } from '@/lib/statement-urgency'

export async function SummaryCard({ statementId }: { statementId: string }) {
  const t = await getTranslations('propertyDetail')
  const locale = await getLocale()
  const statement = await getStatement(statementId)
  // Due day comes from the unit's active rent row. When no rent row exists
  // yet (pre-pivot units / units mid-creation) we omit the date-bearing
  // lines instead of inventing a fake number.
  const rent = await getUnitRent(statement.unitId)
  const missingCharges = await getMissingCharges(
    statement.unitId, statementId, statement.periodYear, statement.periodMonth,
  )

  const tenantTotal = formatCurrency(statement.tenantTotalMinor, statement.currency)
  const landlordTotal = formatCurrency(statement.landlordTotalMinor, statement.currency)
  const total = formatCurrency(statement.totalAmountMinor, statement.currency)
  const isEstimated = missingCharges.length > 0
  const hasSplit = statement.landlordTotalMinor > 0

  const dueDayOfMonth = rent?.dueDayOfMonth ?? null
  const dueDateLabel = dueDayOfMonth != null
    ? new Date(statement.periodYear, statement.periodMonth - 1, dueDayOfMonth)
        .toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const urgency = dueDayOfMonth != null
    ? getStatementUrgency(dueDayOfMonth, statement.periodYear, statement.periodMonth)
    : null
  const daysUntilPublish = dueDayOfMonth != null
    ? getDaysUntilPublishBy(dueDayOfMonth, statement.periodYear, statement.periodMonth)
    : null
  const publishByLabel = dueDayOfMonth != null
    ? new Date(statement.periodYear, statement.periodMonth - 1, getPublishByDay(dueDayOfMonth))
        .toLocaleDateString(locale, { month: 'long', day: 'numeric' })
    : null

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {isEstimated ? t('estimatedTenantOwes') : t('tenantOwes')}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{tenantTotal}</p>
      {publishByLabel && urgency === 'overdue' ? (
        <p className="mt-2 text-sm font-medium text-destructive">{t('publishOverdue', { date: publishByLabel })}</p>
      ) : publishByLabel && urgency === 'approaching' && daysUntilPublish === 0 ? (
        <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          {t('publishToday')}
        </p>
      ) : publishByLabel && urgency === 'approaching' && daysUntilPublish != null ? (
        <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          {t('publishByCountdown', { date: publishByLabel, days: daysUntilPublish })}
        </p>
      ) : publishByLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('publishBy', { date: publishByLabel })}</p>
      ) : null}
      {dueDateLabel && (
        <p className="mt-1 text-sm text-muted-foreground">{t('paymentDue', { date: dueDateLabel })}</p>
      )}

      {hasSplit && (
        <>
          <Separator className="my-4" />
          <div className="text-sm tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('youCover')}</span>
              <span className="font-semibold text-foreground">{landlordTotal}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-muted-foreground">{t('totalCharges')}</span>
              <span className="font-semibold text-foreground">{total}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
