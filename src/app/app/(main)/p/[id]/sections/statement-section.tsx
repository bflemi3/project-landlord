'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InfoBox, InfoBoxIcon, InfoBoxContent } from '@/components/info-box'
import { useUnit } from '@/lib/hooks/use-unit'
import { useUnitStatements, type UnitStatement } from '@/lib/hooks/use-unit-statements'
import { useMissingCharges } from '@/lib/hooks/use-missing-charges'
import { useProperty } from '@/lib/hooks/use-property'
import { createStatement } from '@/app/actions/statements/create-statement'
import { unitStatementsQueryKey } from '@/lib/queries/unit-statements'
import { homePropertiesQueryKey } from '@/lib/queries/home-properties'
import { homeActionsQueryKey } from '@/lib/queries/home-actions'
import { formatCurrency } from '@/lib/format-currency'
import {
  getCurrentPeriod,
  formatPeriod,
  getStatementUrgency,
  getDaysUntilDue,
  type UrgencyLevel,
} from '@/lib/statement-urgency'

export function StatementSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: unit } = useUnit(unitId)
  const { data: property } = useProperty(propertyId)
  const { data: statements } = useUnitStatements(unitId)
  const [isPending, startTransition] = useTransition()

  const { year: currentYear, month: currentMonth } = getCurrentPeriod()

  // Find the current period's statement
  const currentStatement = statements.find(
    (s) => s.periodYear === currentYear && s.periodMonth === currentMonth,
  )

  const urgency = getStatementUrgency(unit.dueDay, currentYear, currentMonth)
  const daysUntil = getDaysUntilDue(unit.dueDay, currentYear, currentMonth)
  const periodLabel = formatPeriod(currentYear, currentMonth, locale)

  function handleGenerate() {
    startTransition(async () => {
      const result = await createStatement(unitId, currentYear, currentMonth)
      if (result.success && result.statementId) {
        queryClient.invalidateQueries({ queryKey: unitStatementsQueryKey(unitId) })
        queryClient.invalidateQueries({ queryKey: homeActionsQueryKey() })
        queryClient.invalidateQueries({ queryKey: homePropertiesQueryKey() })

        posthog.capture('statement_draft_created', {
          property_id: propertyId,
          unit_id: unitId,
          period_year: currentYear,
          period_month: currentMonth,
        })

        router.push(`/app/p/${propertyId}/s/${result.statementId}`)
      }
    })
  }

  if (currentStatement) {
    return (
      <DraftCardWithData
        statement={currentStatement}
        unitId={unitId}
        propertyId={propertyId}
        periodLabel={periodLabel}
        urgency={urgency}
        daysUntil={daysUntil}
        currency={unit.currency}
      />
    )
  }

  return (
    <GenerateCard
      periodLabel={periodLabel}
      urgency={urgency}
      daysUntil={daysUntil}
      isPending={isPending}
      onGenerate={handleGenerate}
      t={t}
    />
  )
}

// =============================================================================
// Generate CTA card — no statement exists for current period
// =============================================================================

function GenerateCard({
  periodLabel,
  urgency,
  daysUntil,
  isPending,
  onGenerate,
  t,
}: {
  periodLabel: string
  urgency: UrgencyLevel
  daysUntil: number
  isPending: boolean
  onGenerate: () => void
  t: ReturnType<typeof useTranslations<'propertyDetail'>>
}) {
  return (
    <div className="mb-8">
      {urgency !== 'normal' && (
        <InfoBox variant={urgency === 'overdue' ? 'destructive' : 'warning'} className="mb-3">
          <InfoBoxIcon>
            <AlertTriangle className="size-4" />
          </InfoBoxIcon>
          <InfoBoxContent>
            {urgency === 'overdue'
              ? `${t('statementOverdue', { period: periodLabel })} — ${t('tenantsWaiting')}`
              : `${t('statementNotStarted', { period: periodLabel })} — ${t('dueInDays', { days: daysUntil })}`}
          </InfoBoxContent>
        </InfoBox>
      )}

      <Button
        onClick={onGenerate}
        loading={isPending}
        className="h-12 w-full rounded-2xl"
        size="lg"
      >
        <FileText />
        {t('generateStatement', { period: periodLabel })}
      </Button>
    </div>
  )
}

// =============================================================================
// Draft card wrapper — fetches missing charges (can't call hooks conditionally)
// =============================================================================

function DraftCardWithData({
  statement,
  unitId,
  propertyId,
  periodLabel,
  urgency,
  daysUntil,
  currency,
}: {
  statement: UnitStatement
  unitId: string
  propertyId: string
  periodLabel: string
  urgency: UrgencyLevel
  daysUntil: number
  currency: string
}) {
  const t = useTranslations('propertyDetail')
  const { data: missingCharges } = useMissingCharges(
    unitId, statement.id, statement.periodYear, statement.periodMonth,
  )

  return (
    <DraftCard
      statement={statement}
      propertyId={propertyId}
      periodLabel={periodLabel}
      urgency={urgency}
      daysUntil={daysUntil}
      currency={currency}
      missingCount={missingCharges.length}
      t={t}
    />
  )
}

// =============================================================================
// Draft card — statement exists, show summary
// =============================================================================

function DraftCard({
  statement,
  propertyId,
  periodLabel,
  urgency,
  daysUntil,
  currency,
  missingCount,
  t,
}: {
  statement: UnitStatement
  propertyId: string
  periodLabel: string
  urgency: UrgencyLevel
  daysUntil: number
  currency: string
  missingCount: number
  t: ReturnType<typeof useTranslations<'propertyDetail'>>
}) {
  const total = formatCurrency(statement.totalAmountMinor, currency)

  return (
    <div className="mb-8">
      {urgency !== 'normal' && statement.status === 'draft' && (
        <InfoBox variant={urgency === 'overdue' ? 'destructive' : 'warning'} className="mb-3">
          <InfoBoxIcon>
            <Clock className="size-4" />
          </InfoBoxIcon>
          <InfoBoxContent>
            {urgency === 'overdue'
              ? `${t('statementOverdue', { period: periodLabel })} — ${t('draftNotPublished')}`
              : `${t('dueInDays', { days: daysUntil })} — ${t('draftNotPublished')}`}
          </InfoBoxContent>
        </InfoBox>
      )}

      <a
        href={`/app/p/${propertyId}/s/${statement.id}`}
        className="group block rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 transition-colors hover:border-primary/50 dark:bg-primary/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex">
                <FileText className="size-4 text-primary" />
              </div>
              <p className="truncate text-sm font-semibold text-foreground">
                {t('statementDraft', { period: periodLabel })}
              </p>
              <Badge variant="outline" className="shrink-0 border-dashed border-primary/30 text-xs text-primary">
                {t('draft')}
              </Badge>
            </div>
          </div>
          <p className="shrink-0 text-xl font-bold tabular-nums text-foreground">{total}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            {t('completeStatement')}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
          {missingCount > 0 && (
            <>
              <span className="text-sm text-amber-600 sm:hidden dark:text-amber-400">
                {missingCount} missing
              </span>
              <span className="hidden text-xs text-amber-600 sm:inline dark:text-amber-400">
                {t('missingCharges', { count: missingCount })}
              </span>
            </>
          )}
        </div>
      </a>
    </div>
  )
}
