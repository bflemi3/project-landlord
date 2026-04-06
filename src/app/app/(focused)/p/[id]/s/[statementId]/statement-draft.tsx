'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { X, Clock } from 'lucide-react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { useStatement } from '@/lib/hooks/use-statement'
import { useStatementCharges } from '@/lib/hooks/use-statement-charges'
import { useMissingCharges } from '@/lib/hooks/use-missing-charges'
import { useUnit } from '@/lib/hooks/use-unit'
import { useProperty } from '@/lib/hooks/use-property'
import { formatCurrency } from '@/lib/format-currency'
import { formatPeriod } from '@/lib/statement-urgency'

export function StatementDraft({ statementId, propertyId }: { statementId: string; propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const locale = useLocale()
  const router = useRouter()

  const { data: statement } = useStatement(statementId)
  const { data: charges } = useStatementCharges(statementId)
  const { data: unit } = useUnit(statement.unitId)
  const { data: property } = useProperty(propertyId)
  const { data: missingCharges } = useMissingCharges(
    statement.unitId, statementId, statement.periodYear, statement.periodMonth,
  )

  const periodLabel = formatPeriod(statement.periodYear, statement.periodMonth, locale)
  const total = formatCurrency(statement.totalAmountMinor, statement.currency)
  const dueDate = new Date(statement.periodYear, statement.periodMonth - 1, unit.dueDay)
  const dueDateLabel = dueDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })

  // Fire statement_viewed on mount
  useEffect(() => {
    posthog.capture('statement_viewed', {
      statement_id: statementId,
      viewer_role: 'landlord',
    })
  }, [statementId])

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const subtitle = [unit.name, address].filter(Boolean).join(' · ')

  return (
    <DetailPageLayout>
      <DetailPageLayoutHeader>
        {/* Close button */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/app/p/${propertyId}`)}
          >
            <X />
          </Button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {t('statementDraft', { period: periodLabel })}
            </h1>
            <Badge variant="outline" className="border-dashed border-primary/30 text-xs text-primary">
              {t('draft')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Mobile-only: summary card in header */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 md:hidden dark:bg-zinc-800/80">
          <p className="text-sm text-muted-foreground">
            {missingCharges.length > 0 ? 'Estimated total' : 'Total due'}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{total}</p>
          <p className="mt-2 text-sm text-muted-foreground">Due {dueDateLabel}</p>
        </div>
      </DetailPageLayoutHeader>

      <DetailPageLayoutBody>
        <DetailPageLayoutMain>
          {/* Completeness warning */}
          {missingCharges.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t('missingCharges', { count: missingCharges.length })}
              </p>
              <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/60">
                Missing charges won&apos;t block publishing. You can revise the statement later.
              </p>
            </div>
          )}

          {/* Charges list */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              {t('charges')} ({charges.length})
            </h2>
            <div className="space-y-1 rounded-2xl border border-border p-1.5">
              {charges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{charge.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {charge.chargeDefinitionId ? t('recurring') : 'Manual'}
                      {charge.sourceDocumentId && ' · Bill attached'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(charge.amountMinor, charge.currency)}
                  </p>
                </div>
              ))}

              {/* Missing charges */}
              {missingCharges.map((missing) => (
                <div
                  key={missing.definitionId}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{missing.name}</p>
                    <Badge variant="secondary" className="mt-0.5 text-xs">missing</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary">
                    Add
                  </Button>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground">Total</p>
                <p className="text-base font-bold tabular-nums text-foreground">{total}</p>
              </div>
            </div>
          </div>
        </DetailPageLayoutMain>

        <DetailPageLayoutSidebar>
          {/* Summary card — desktop only (mobile shows total in header) */}
          <div className="hidden rounded-2xl border border-border bg-card p-5 md:block dark:bg-zinc-800/80">
            <p className="text-sm text-muted-foreground">
              {missingCharges.length > 0 ? 'Estimated total' : 'Total due'}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{total}</p>
            <p className="mt-2 text-sm text-muted-foreground">Due {dueDateLabel}</p>
          </div>

          {/* Review & Publish + audit note grouped together */}
          <div className="hidden md:block">
            <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
              Review & Publish
            </Button>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Clock className="size-3" />
              <span>
                Draft created {new Date(statement.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </DetailPageLayoutSidebar>
      </DetailPageLayoutBody>

      {/* Mobile bottom bar */}
      <StickyBottomBar className="md:hidden">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Clock className="size-3" />
          <span>
            Draft created {new Date(statement.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
          Review & Publish
        </Button>
      </StickyBottomBar>
    </DetailPageLayout>
  )
}
