'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, FileText } from 'lucide-react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useHighlightTarget } from '@/lib/hooks/use-highlight-target'
import { formatCurrency } from '@/lib/format-currency'
import { formatDays } from '@/lib/format-days'
import type { UrgencyLevel } from '@/lib/statement-urgency'
import { createStatement } from '@/data/statements/actions/create-statement'
import { unitStatementsQueryKey } from '@/data/units/shared'
import { homeActionsQueryKey, homePropertiesQueryKey } from '@/data/home/shared'

interface BillingSummaryCardClientProps {
  unitId: string
  propertyId: string
  currency: string
  dueDay: number
  tenantTotal: number
  isEstimate: boolean
  periodLabel: string
  urgency: UrgencyLevel
  daysUntil: number
  year: number
  month: number
  currentStatement: {
    id: string
    tenantTotalMinor: number
  } | null
}

export function BillingSummaryCardClient({
  unitId,
  propertyId,
  currency,
  dueDay,
  tenantTotal,
  isEstimate,
  periodLabel,
  urgency,
  daysUntil,
  year,
  month,
  currentStatement,
}: BillingSummaryCardClientProps) {
  const t = useTranslations('propertyDetail')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const { ref: generateRef, highlighted: generateHighlighted } = useHighlightTarget('generate-statement')

  function handleGenerate() {
    startTransition(async () => {
      const result = await createStatement(unitId, year, month)
      if (result.success && result.statementId) {
        queryClient.invalidateQueries({ queryKey: unitStatementsQueryKey(unitId) })
        queryClient.invalidateQueries({ queryKey: homeActionsQueryKey() })
        queryClient.invalidateQueries({ queryKey: homePropertiesQueryKey() })

        posthog.capture('statement_draft_created', {
          property_id: propertyId,
          unit_id: unitId,
          period_year: year,
          period_month: month,
        })

        router.push(`/app/p/${propertyId}/s/${result.statementId}`)
      }
    })
  }

  const actionBg = urgency === 'overdue'
    ? 'bg-destructive/10 dark:bg-destructive/15'
    : urgency === 'approaching'
      ? 'bg-amber-500/10 dark:bg-amber-500/15'
      : 'bg-primary/10 dark:bg-primary/15'

  const actionText = urgency === 'overdue'
    ? 'text-destructive'
    : urgency === 'approaching'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-primary'

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80 dark:shadow-none">
      {/* Hero: collection amount + due day */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {formatCurrency(tenantTotal, currency)}
        </span>
        <span className="text-sm text-muted-foreground">
          {isEstimate ? t('estimatedTenantOwes') : t('tenantOwes')}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t('paymentDueMonthly', { day: `${dueDay}${getOrdinalSuffix(dueDay)}` })}
      </p>

      {/* Action area: statement status */}
      {currentStatement ? (
        <a
          href={`/app/p/${propertyId}/s/${currentStatement.id}`}
          className={`group mt-4 flex items-center justify-between gap-3 rounded-xl p-3.5 transition-colors ${actionBg}`}
        >
          <div className="min-w-0">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${actionText}`}>
              {t('completeStatement')}
              {urgency === 'overdue' && ` — ${t('daysOverdue', { days: formatDays(daysUntil) })}`}
              {urgency === 'approaching' && ` — ${daysUntil === 0 ? t('dueToday') : t('daysLeft', { days: formatDays(daysUntil) })}`}
            </span>
            <p className="mt-0.5 text-sm text-muted-foreground sm:text-xs">
              {t('statementDraft', { period: periodLabel })} · {t('draft')}
              {currentStatement.tenantTotalMinor !== tenantTotal ? ` · ${t('incomplete')}` : ''}
            </p>
          </div>
          <ChevronRight className={`size-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${actionText}`} />
        </a>
      ) : (
        <div className="mt-4">
          {urgency !== 'normal' && (
            <>
              <Separator className="mb-4 dark:bg-zinc-600" />
              <p className={`mb-2 text-sm font-medium ${actionText}`}>
                {urgency === 'overdue'
                  ? t('statementOverdueShort', { period: periodLabel, days: formatDays(daysUntil) })
                  : daysUntil === 0
                    ? t('statementDueToday', { period: periodLabel })
                    : t('statementDueIn', { period: periodLabel, days: formatDays(daysUntil) })}
              </p>
            </>
          )}
          <Button
            ref={generateRef}
            onClick={handleGenerate}
            loading={isPending}
            className={`h-10 w-full rounded-xl ${generateHighlighted ? 'section-highlight' : ''}`}
          >
            <FileText />
            {t('generateStatement', { period: periodLabel })}
          </Button>
        </div>
      )}
    </div>
  )
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
