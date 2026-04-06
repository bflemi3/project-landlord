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
import { SummaryCard } from './sections/summary-card'
import { CompletenessWarning } from './sections/completeness-warning'
import { ChargesList, scrollToMissingCharges } from './sections/charges-list'

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
  const isEstimated = missingCharges.length > 0
  const createdLabel = new Date(statement.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })

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
        <div className="mb-6 md:hidden">
          <SummaryCard total={total} dueDateLabel={dueDateLabel} isEstimated={isEstimated} />
        </div>
      </DetailPageLayoutHeader>

      <DetailPageLayoutBody>
        <DetailPageLayoutMain>
          <CompletenessWarning
            missingCount={missingCharges.length}
            onReview={scrollToMissingCharges}
          />

          <ChargesList
            charges={charges}
            missingCharges={missingCharges}
            currency={statement.currency}
            totalAmountMinor={statement.totalAmountMinor}
            onAddCharge={() => {/* TODO: Task 19b — open add charge sheet */}}
            onAddMissingCharge={() => {/* TODO: Task 19b — open add charge sheet pre-filled */}}
            onEditCharge={() => {/* TODO: Task 19b — open edit charge sheet */}}
          />
        </DetailPageLayoutMain>

        <DetailPageLayoutSidebar>
          {/* Desktop-only summary card */}
          <div className="hidden md:block">
            <SummaryCard total={total} dueDateLabel={dueDateLabel} isEstimated={isEstimated} />
          </div>

          {/* Review & Publish + audit note */}
          <div className="hidden md:block">
            <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
              Review & Publish
            </Button>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Clock className="size-3" />
              <span>Draft created {createdLabel}</span>
            </div>
          </div>
        </DetailPageLayoutSidebar>
      </DetailPageLayoutBody>

      {/* Mobile bottom bar */}
      <StickyBottomBar className="md:hidden">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Clock className="size-3" />
          <span>Draft created {createdLabel}</span>
        </div>
        <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
          Review & Publish
        </Button>
      </StickyBottomBar>
    </DetailPageLayout>
  )
}
