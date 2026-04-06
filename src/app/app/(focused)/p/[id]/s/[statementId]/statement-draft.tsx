'use client'

import { useEffect, useState } from 'react'
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
import { useUnit } from '@/lib/hooks/use-unit'
import { useProperty } from '@/lib/hooks/use-property'
import { formatPeriod, getStatementUrgency, getDaysUntilDue } from '@/lib/statement-urgency'
import { SummaryCard } from './sections/summary-card'
import { CompletenessWarning } from './sections/completeness-warning'
import { ChargesList, scrollToMissingCharges } from './sections/charges-list'
import { AddChargeSheet } from './add-charge-sheet'
import type { ChargeInstance } from '@/lib/queries/statement-charges'
import type { MissingCharge } from '@/lib/queries/missing-charges'

export function StatementDraft({ statementId, propertyId }: { statementId: string; propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const locale = useLocale()
  const router = useRouter()

  // Parent fetches only what it needs — children fetch their own data
  const { data: statement } = useStatement(statementId)
  const { data: unit } = useUnit(statement.unitId)
  const { data: property } = useProperty(propertyId)

  const periodLabel = formatPeriod(statement.periodYear, statement.periodMonth, locale)
  const createdLabel = new Date(statement.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  const urgency = getStatementUrgency(unit.dueDay, statement.periodYear, statement.periodMonth)
  const daysUntil = getDaysUntilDue(unit.dueDay, statement.periodYear, statement.periodMonth)

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<ChargeInstance | null>(null)
  const [fillingMissing, setFillingMissing] = useState<MissingCharge | null>(null)

  // Fire statement_viewed on mount
  useEffect(() => {
    posthog.capture('statement_viewed', {
      statement_id: statementId,
      viewer_role: 'landlord',
    })
  }, [statementId])

  const address = [property.street, property.number].filter(Boolean).join(', ')
  const subtitle = [unit.name, address].filter(Boolean).join(' · ')

  function handleAddCharge() {
    setEditingInstance(null)
    setFillingMissing(null)
    setSheetOpen(true)
  }

  function handleAddMissingCharge(missing: MissingCharge) {
    setEditingInstance(null)
    setFillingMissing(missing)
    setSheetOpen(true)
  }

  function handleEditCharge(charge: ChargeInstance) {
    setFillingMissing(null)
    setEditingInstance(charge)
    setSheetOpen(true)
  }

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
          <SummaryCard statementId={statementId} />
        </div>
      </DetailPageLayoutHeader>

      <DetailPageLayoutBody>
        <DetailPageLayoutMain>
          <CompletenessWarning
            statementId={statementId}
            onReview={scrollToMissingCharges}
          />

          <ChargesList
            statementId={statementId}
            onAddCharge={handleAddCharge}
            onAddMissingCharge={handleAddMissingCharge}
            onEditCharge={handleEditCharge}
          />
        </DetailPageLayoutMain>

        <DetailPageLayoutSidebar>
          {/* Desktop-only summary card */}
          <div className="hidden md:block">
            <SummaryCard statementId={statementId} />
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

      {/* Add/edit charge sheet */}
      <AddChargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        statementId={statementId}
        unitId={statement.unitId}
        periodYear={statement.periodYear}
        periodMonth={statement.periodMonth}
        currency={statement.currency}
        missingCharge={fillingMissing}
        existingInstance={editingInstance}
      />
    </DetailPageLayout>
  )
}
