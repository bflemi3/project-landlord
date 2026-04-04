'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { ChargeCard } from '@/components/charge-card'
import { ChargeConfigSheet, type ChargeConfig } from '@/app/app/p/new/steps/charge-config-sheet'
import { createCharges } from '@/app/actions/properties/create-charges'
import { updateCharge } from '@/app/actions/properties/update-charge'
import { removeCharge } from '@/app/actions/properties/remove-charge'
import { toggleChargeActive } from '@/app/actions/properties/toggle-charge-active'
import { useUnit } from '@/lib/hooks/use-unit'
import { useUnitCharges, type ChargeDefinition } from '@/lib/hooks/use-unit-charges'
import { useHighlightTarget } from '@/lib/hooks/use-highlight-target'

/** Convert a ChargeDefinition (from DB) to a ChargeConfig (for the form) */
function toChargeConfig(charge: ChargeDefinition): ChargeConfig {
  return {
    name: charge.name,
    chargeType: charge.chargeType,
    amountMinor: charge.amountMinor,
    payer: charge.split.payer,
    splitMode: charge.split.allocationType === 'fixed_amount' ? 'amount' : 'percent',
    tenantPercent: charge.split.tenantPercent,
    landlordPercent: charge.split.landlordPercent,
    tenantFixedMinor: charge.split.tenantFixedMinor ?? undefined,
    landlordFixedMinor: charge.split.landlordFixedMinor ?? undefined,
  }
}

export function ChargesSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const { data: unit } = useUnit(unitId)
  const { data: charges } = useUnitCharges(unitId)
  const { ref: addBtnRef, highlighted: addBtnGlow } = useHighlightTarget('add-charge')

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<ChargeDefinition | null>(null)

  function handleAddCharge() {
    setEditingCharge(null)
    setSheetOpen(true)
  }

  function handleEditCharge(charge: ChargeDefinition) {
    setEditingCharge(charge)
    setSheetOpen(true)
  }

  async function handleSave(config: ChargeConfig) {
    if (editingCharge) {
      // Update existing
      await updateCharge({
        chargeId: editingCharge.id,
        name: config.name,
        chargeType: config.chargeType,
        amountMinor: config.amountMinor,
        payer: config.payer,
        splitMode: config.splitMode,
        tenantPercent: config.tenantPercent,
        landlordPercent: config.landlordPercent,
        tenantFixedMinor: config.tenantFixedMinor,
        landlordFixedMinor: config.landlordFixedMinor,
      })
    } else {
      // Create new
      await createCharges(unitId, [{
        name: config.name,
        chargeType: config.chargeType,
        amountMinor: config.amountMinor,
        payer: config.payer,
        splitMode: config.splitMode,
        tenantPercent: config.tenantPercent,
        landlordPercent: config.landlordPercent,
        tenantFixedMinor: config.tenantFixedMinor,
        landlordFixedMinor: config.landlordFixedMinor,
      }])

      posthog.capture('charge_definition_created', {
        property_id: propertyId,
        charge_type: config.chargeType,
      })
    }

    setSheetOpen(false)
    setEditingCharge(null)
    queryClient.invalidateQueries({ queryKey: ['unit-charges', unitId] })
    queryClient.invalidateQueries({ queryKey: ['property-counts'] })
  }

  async function handleToggleActive() {
    if (!editingCharge) return
    await toggleChargeActive(editingCharge.id, !editingCharge.isActive)
    setSheetOpen(false)
    setEditingCharge(null)
    queryClient.invalidateQueries({ queryKey: ['unit-charges', unitId] })
  }

  async function handleRemove() {
    if (!editingCharge) return
    await removeCharge(editingCharge.id)
    setSheetOpen(false)
    setEditingCharge(null)
    queryClient.invalidateQueries({ queryKey: ['unit-charges', unitId] })
    queryClient.invalidateQueries({ queryKey: ['property-counts'] })
  }

  async function handleSkip() {
    setSheetOpen(false)
    setEditingCharge(null)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('charges')} ({charges.length})
        </h2>
        <Button
          ref={addBtnRef}
          variant="ghost"
          size="sm"
          className={addBtnGlow ? 'section-highlight text-muted-foreground' : 'text-muted-foreground'}
          onClick={handleAddCharge}
        >
          <Plus />
          {t('addCharge')}
        </Button>
      </div>

      {charges.length === 0 ? (
        <button
          onClick={handleAddCharge}
          className="w-full rounded-2xl border border-dashed border-border px-5 py-8 text-center transition-colors hover:border-primary/30"
        >
          <p className="text-sm text-muted-foreground">{t('noCharges')}</p>
        </button>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {charges.map((charge) => (
            <ChargeCard
              key={charge.id}
              charge={charge}
              onClick={() => handleEditCharge(charge)}
              className="border-0"
            />
          ))}
        </div>
      )}

      <ChargeConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        chargeName={editingCharge?.name ?? ''}
        isCustom={true}
        defaultType={editingCharge?.chargeType ?? 'recurring'}
        currency={unit.currency}
        existingConfig={editingCharge ? toChargeConfig(editingCharge) : null}
        onSave={handleSave}
        onSkip={handleSkip}
        onToggleActive={editingCharge ? handleToggleActive : undefined}
        onRemove={editingCharge ? handleRemove : undefined}
        isActive={editingCharge?.isActive}
      />
    </div>
  )
}
