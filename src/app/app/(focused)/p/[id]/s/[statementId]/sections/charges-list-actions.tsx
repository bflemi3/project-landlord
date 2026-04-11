'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Home, Repeat, Zap, Paperclip, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChargeRow,
  ChargeRowIcon,
  ChargeRowContent,
  ChargeRowTitle,
  ChargeRowDescription,
  ChargeRowAmount,
} from '@/components/charge-row'
import { AddChargeSheet } from '../add-charge-sheet'
import { formatCurrency } from '@/lib/format-currency'
import type { ChargeInstance, MissingCharge } from '@/data/statements/shared'

const CHARGE_TYPE_ICONS: Record<string, React.ElementType> = {
  rent: Home,
  recurring: Repeat,
  variable: Zap,
}

function getChargeIcon(charge: ChargeInstance): React.ElementType {
  if (charge.chargeDefinitionId) {
    const name = charge.name.toLowerCase()
    if (name.includes('rent') || name.includes('aluguel')) return Home
    if (name.includes('electric') || name.includes('energia') || name.includes('luz')) return Zap
    if (name.includes('water') || name.includes('água')) return Zap
    if (name.includes('gas') || name.includes('gás')) return Zap
    return Repeat
  }
  return Repeat
}

function getSourceLabel(charge: ChargeInstance, t: ReturnType<typeof useTranslations<'propertyDetail'>>): string {
  if (charge.chargeDefinitionId) return t('recurring')
  return t('manual')
}

function getSplitLabel(charge: ChargeInstance, t: ReturnType<typeof useTranslations<'propertyDetail'>>): string {
  if (charge.splitType === 'percentage') {
    if (charge.landlordPercentage === 100) return ` · ${t('landlordPays')}`
    if (charge.tenantPercentage === 100 || charge.tenantPercentage === null) return ''
    return ` · ${charge.tenantPercentage}/${charge.landlordPercentage}`
  }
  if (charge.splitType === 'fixed_amount' && charge.tenantFixedMinor != null && charge.landlordFixedMinor != null) {
    return ` · ${formatCurrency(charge.tenantFixedMinor, charge.currency)} / ${formatCurrency(charge.landlordFixedMinor, charge.currency)}`
  }
  return ''
}

/** Scrolls the missing charges section into view */
export function scrollToMissingCharges() {
  document.getElementById('missing-charges')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function ChargesListInteractive({
  charges,
  missingCharges,
  totalFormatted,
  chargesCount,
  totalCount,
  hasMissing,
  statementId,
  unitId,
  periodYear,
  periodMonth,
  currency,
}: {
  charges: ChargeInstance[]
  missingCharges: MissingCharge[]
  totalFormatted: string
  chargesCount: number
  totalCount: number
  hasMissing: boolean
  statementId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currency: string
}) {
  const t = useTranslations('propertyDetail')
  const missingRef = useRef<HTMLDivElement>(null)

  // Sheet state — previously in StatementSheetController
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<ChargeInstance | null>(null)
  const [fillingMissing, setFillingMissing] = useState<MissingCharge | null>(null)

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

  // Manual charges first (by created date), then definition-generated
  const sortedCharges = [...charges].sort((a, b) => {
    const aManual = !a.chargeDefinitionId
    const bManual = !b.chargeDefinitionId
    if (aManual && !bManual) return -1
    if (!aManual && bManual) return 1
    return 0
  })

  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t('charges')} ({hasMissing ? t('chargesOfTotal', { count: chargesCount, total: totalCount }) : chargesCount})
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleAddCharge}>
            <Plus />
            {t('addCharge')}
          </Button>
        </div>

        <div className="space-y-1 rounded-2xl border border-border p-1.5">
          {/* Missing charges — shown first (actionable items) */}
          {missingCharges.length > 0 && (
            <div ref={missingRef} id="missing-charges">
              {missingCharges.map((missing) => {
                const Icon = CHARGE_TYPE_ICONS[missing.chargeType] ?? Zap
                return (
                  <ChargeRow
                    key={missing.definitionId}
                    className="border-transparent"
                    onClick={() => handleAddMissingCharge(missing)}
                  >
                    <ChargeRowIcon>
                      <Icon className="size-4" />
                    </ChargeRowIcon>
                    <ChargeRowContent>
                      <ChargeRowTitle>{missing.name}</ChargeRowTitle>
                      <Badge className="mt-0.5 border-0 bg-amber-500/15 text-xs text-amber-500">{t('missingBadge')}</Badge>
                    </ChargeRowContent>
                    <span className="text-sm font-semibold text-primary">{t('add')}</span>
                  </ChargeRow>
                )
              })}
            </div>
          )}

          {/* Existing charges — manual first, then definition-generated */}
          {sortedCharges.map((charge) => {
            const Icon = getChargeIcon(charge)
            const sourceLabel = getSourceLabel(charge, t)
            const hasBill = !!charge.sourceDocumentId

            return (
              <ChargeRow
                key={charge.id}
                onClick={() => handleEditCharge(charge)}
                className="border-transparent"
              >
                <ChargeRowIcon>
                  <Icon className="size-4" />
                </ChargeRowIcon>
                <ChargeRowContent>
                  <ChargeRowTitle>{charge.name}</ChargeRowTitle>
                  <ChargeRowDescription>
                    {sourceLabel}
                    {getSplitLabel(charge, t)}
                    {hasBill && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center gap-1 align-middle">
                          <Paperclip className="size-3 shrink-0" />{t('billAttached')}
                        </span>
                      </>
                    )}
                  </ChargeRowDescription>
                </ChargeRowContent>
                <ChargeRowAmount className="text-sm">
                  {formatCurrency(charge.amountMinor, charge.currency)}
                </ChargeRowAmount>
              </ChargeRow>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3.5">
            <p className="text-sm font-semibold text-foreground">{t('total')}</p>
            <p className="text-base font-bold tabular-nums text-foreground">{totalFormatted}</p>
          </div>
        </div>
      </div>

      {/* Add/edit charge sheet */}
      <AddChargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        statementId={statementId}
        unitId={unitId}
        periodYear={periodYear}
        periodMonth={periodMonth}
        currency={currency}
        missingCharge={fillingMissing}
        existingInstance={editingInstance}
      />
    </>
  )
}
