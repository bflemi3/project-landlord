'use client'

import { useLocale } from 'next-intl'
import { useStatement } from '@/lib/hooks/use-statement'
import { useUnit } from '@/lib/hooks/use-unit'
import { useMissingCharges } from '@/lib/hooks/use-missing-charges'
import { formatCurrency } from '@/lib/format-currency'
import { Separator } from '@/components/ui/separator'
import { getStatementUrgency, getDaysUntilDue } from '@/lib/statement-urgency'

export function SummaryCard({ statementId }: { statementId: string }) {
  const locale = useLocale()
  const { data: statement } = useStatement(statementId)
  const { data: unit } = useUnit(statement.unitId)
  const { data: missingCharges } = useMissingCharges(
    statement.unitId, statementId, statement.periodYear, statement.periodMonth,
  )

  const tenantTotal = formatCurrency(statement.tenantTotalMinor, statement.currency)
  const landlordTotal = formatCurrency(statement.landlordTotalMinor, statement.currency)
  const total = formatCurrency(statement.totalAmountMinor, statement.currency)
  const dueDate = new Date(statement.periodYear, statement.periodMonth - 1, unit.dueDay)
  const dueDateLabel = dueDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
  const isEstimated = missingCharges.length > 0
  const hasSplit = statement.landlordTotalMinor > 0
  const urgency = getStatementUrgency(unit.dueDay, statement.periodYear, statement.periodMonth)
  const daysUntil = getDaysUntilDue(unit.dueDay, statement.periodYear, statement.periodMonth)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 dark:bg-zinc-800/80">
      <p className="text-sm text-muted-foreground">
        {isEstimated ? 'Estimated ' : ''}Tenant owes
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{tenantTotal}</p>
      {urgency === 'overdue' ? (
        <p className="mt-2 text-sm font-medium text-destructive">Overdue — due {dueDateLabel}</p>
      ) : urgency === 'approaching' ? (
        <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'} — {dueDateLabel}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Due {dueDateLabel}</p>
      )}

      {hasSplit && (
        <>
          <Separator className="my-4 dark:bg-zinc-600" />
          <div className="text-sm tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You cover</span>
              <span className="font-semibold text-foreground">{landlordTotal}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-muted-foreground">Total charges</span>
              <span className="font-semibold text-foreground">{total}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
