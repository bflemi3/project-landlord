'use client'

import { useRef } from 'react'
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
import { formatCurrency } from '@/lib/format-currency'
import type { ChargeInstance } from '@/lib/queries/statement-charges'
import type { MissingCharge } from '@/lib/queries/missing-charges'

const CHARGE_TYPE_ICONS: Record<string, React.ElementType> = {
  rent: Home,
  recurring: Repeat,
  variable: Zap,
}

function getChargeIcon(charge: ChargeInstance): React.ElementType {
  // If linked to a definition, try to match by common name patterns
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
  return 'Manual'
}

export function ChargesList({
  charges,
  missingCharges,
  currency,
  totalAmountMinor,
  onAddCharge,
  onAddMissingCharge,
  onEditCharge,
}: {
  charges: ChargeInstance[]
  missingCharges: MissingCharge[]
  currency: string
  totalAmountMinor: number
  onAddCharge?: () => void
  onAddMissingCharge?: (missing: MissingCharge) => void
  onEditCharge?: (charge: ChargeInstance) => void
}) {
  const t = useTranslations('propertyDetail')
  const missingRef = useRef<HTMLDivElement>(null)

  const total = formatCurrency(totalAmountMinor, currency)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('charges')} ({charges.length})
        </h2>
        {onAddCharge && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onAddCharge}>
            <Plus />
            {t('addCharge')}
          </Button>
        )}
      </div>

      <div className="space-y-1 rounded-2xl border border-border p-1.5">
        {/* Existing charges */}
        {charges.map((charge) => {
          const Icon = getChargeIcon(charge)
          const sourceLabel = getSourceLabel(charge, t)
          const hasBill = !!charge.sourceDocumentId

          return (
            <ChargeRow
              key={charge.id}
              onClick={onEditCharge ? () => onEditCharge(charge) : undefined}
              className="border-transparent"
            >
              <ChargeRowIcon>
                <Icon className="size-4" />
              </ChargeRowIcon>
              <ChargeRowContent>
                <ChargeRowTitle>{charge.name}</ChargeRowTitle>
                <ChargeRowDescription>
                  {sourceLabel}
                  {hasBill && (
                    <span className="inline-flex items-center gap-1">
                      {' · '}<Paperclip className="inline size-3" /> Bill attached
                    </span>
                  )}
                </ChargeRowDescription>
              </ChargeRowContent>
              <ChargeRowAmount className="text-sm">
                {formatCurrency(charge.amountMinor, charge.currency)}
              </ChargeRowAmount>
            </ChargeRow>
          )
        })}

        {/* Missing charges */}
        {missingCharges.length > 0 && (
          <div ref={missingRef} id="missing-charges">
            {missingCharges.map((missing) => {
              const Icon = CHARGE_TYPE_ICONS[missing.chargeType] ?? Zap
              return (
                <ChargeRow key={missing.definitionId} disabled className="border-transparent opacity-50">
                  <ChargeRowIcon>
                    <Icon className="size-4" />
                  </ChargeRowIcon>
                  <ChargeRowContent>
                    <ChargeRowTitle>{missing.name}</ChargeRowTitle>
                    <Badge variant="secondary" className="mt-0.5 text-xs">missing</Badge>
                  </ChargeRowContent>
                  {onAddMissingCharge && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddMissingCharge(missing)
                      }}
                    >
                      Add
                    </Button>
                  )}
                </ChargeRow>
              )
            })}
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3.5">
          <p className="text-sm font-semibold text-foreground">Total</p>
          <p className="text-base font-bold tabular-nums text-foreground">{total}</p>
        </div>
      </div>
    </div>
  )
}

/** Scrolls the missing charges section into view */
export function scrollToMissingCharges() {
  document.getElementById('missing-charges')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
