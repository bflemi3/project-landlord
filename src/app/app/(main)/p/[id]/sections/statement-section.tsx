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
  getDaysUntilPublishBy,
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
  const daysUntil = getDaysUntilPublishBy(unit.dueDay, currentYear, currentMonth)
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
  const tenantTotal = formatCurrency(statement.tenantTotalMinor, currency)

  return (
    <div className="mb-8">
      <a
        href={`/app/p/${propertyId}/s/${statement.id}`}
        className={`group block rounded-2xl border border-dashed p-5 transition-colors ${
          urgency === 'overdue'
            ? 'border-destructive/40 bg-destructive/5 hover:border-destructive/60 dark:bg-destructive/10'
            : urgency === 'approaching'
              ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60 dark:bg-amber-500/10'
              : 'border-primary/30 bg-primary/5 hover:border-primary/50 dark:bg-primary/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {t('statementDraft', { period: periodLabel })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('draft')}{missingCount > 0 ? ' · incomplete' : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold tabular-nums text-foreground">{tenantTotal}</p>
            <p className="text-xs text-muted-foreground">tenant owes</p>
          </div>
        </div>
        <div className="mt-3">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${
            urgency === 'overdue' ? 'text-destructive' : urgency === 'approaching' ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
          }`}>
            {t('completeStatement')}
            {urgency === 'overdue' && ' — overdue'}
            {urgency === 'approaching' && ` — ${daysUntil}d left`}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </a>
    </div>
  )
}
