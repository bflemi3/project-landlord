'use client'

import { useState, lazy, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

const animatedSplitPromise = import('@/components/animated-split-section')
const AnimatedSplitSection = lazy(() =>
  animatedSplitPromise.then(m => ({ default: m.AnimatedSplitSection }))
)
import { ResponsiveModal } from '@/components/responsive-modal'
import {
  ChargeNameInput,
  AmountInput,
  VariablePlaceholder,
  PayerToggle,
  SplitSlider,
} from '@/components/charge-form-fields'

const CURRENCY_SYMBOLS: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' }

export interface ChargeConfig {
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  payer: 'tenant' | 'landlord' | 'split'
  splitMode?: 'percent' | 'amount'
  tenantPercent: number
  landlordPercent: number
  tenantFixedMinor?: number
  landlordFixedMinor?: number
  isCustom?: boolean
}

interface ChargeConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chargeName: string
  isCustom?: boolean
  defaultType: 'rent' | 'recurring' | 'variable'
  currency?: string
  existingConfig?: ChargeConfig | null
  onSave: (config: ChargeConfig) => void
  onSkip: () => void
  onToggleActive?: () => void
  onRemove?: () => void
  isActive?: boolean
}

export function ChargeConfigSheet({
  open,
  onOpenChange,
  chargeName,
  isCustom = false,
  defaultType,
  currency = 'BRL',
  existingConfig,
  onSave,
  onSkip,
  onToggleActive,
  onRemove,
  isActive,
}: ChargeConfigSheetProps) {
  const formKey = `${open}-${existingConfig?.name ?? chargeName}-${existingConfig?.amountMinor ?? ''}`

  const isEditing = existingConfig != null
  const title = isEditing ? undefined : chargeName

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="sm:max-w-lg"
    >
      <ChargeConfigForm
        key={formKey}
        chargeName={chargeName}
        isCustom={isCustom}
        defaultType={defaultType}
        currency={currency}
        existingConfig={existingConfig}
        onSave={onSave}
        onSkip={onSkip}
        onToggleActive={onToggleActive}
        onRemove={onRemove}
        isActive={isActive}
      />
    </ResponsiveModal>
  )
}

function ChargeConfigForm({
  chargeName,
  isCustom,
  defaultType,
  currency,
  existingConfig,
  onSave,
  onSkip,
  onToggleActive,
  onRemove,
  isActive,
}: {
  chargeName: string
  isCustom: boolean
  defaultType: 'rent' | 'recurring' | 'variable'
  currency: string
  existingConfig?: ChargeConfig | null
  onSave: (config: ChargeConfig) => void
  onSkip: () => void
  onToggleActive?: () => void
  onRemove?: () => void
  isActive?: boolean
}) {
  const t = useTranslations('properties')

  const [editableName, setEditableName] = useState(existingConfig?.name ?? chargeName)
  const [chargeType, setChargeType] = useState<'rent' | 'recurring' | 'variable'>(
    existingConfig?.chargeType ?? defaultType,
  )
  const [amount, setAmount] = useState(
    existingConfig?.amountMinor ? String(existingConfig.amountMinor / 100) : '',
  )
  const [payer, setPayer] = useState<'tenant' | 'landlord' | 'split'>(
    existingConfig?.payer ?? 'tenant',
  )
  const [splitMode, setSplitMode] = useState<'percent' | 'amount'>(existingConfig?.splitMode ?? 'percent')
  const [tenantPercent, setTenantPercent] = useState(
    String(existingConfig?.tenantPercent ?? 50),
  )
  const [tenantFixedAmount, setTenantFixedAmount] = useState(
    existingConfig?.tenantFixedMinor != null ? existingConfig.tenantFixedMinor / 100 : 0,
  )

  const isFixed = chargeType === 'rent' || chargeType === 'recurring'
  const canSave = (isFixed ? amount.trim().length > 0 && Number(amount.replace(',', '.')) > 0 : true) && editableName.trim().length > 0

  function handleSave() {
    const numAmount = Number(amount.replace(',', '.'))
    const totalMinor = isFixed && numAmount ? Math.round(numAmount * 100) : null
    const tp = payer === 'tenant' ? 100 : payer === 'landlord' ? 0 : Number(tenantPercent) || 50

    let tenantFixed: number | undefined
    let landlordFixed: number | undefined
    if (payer === 'split' && splitMode === 'amount' && totalMinor) {
      tenantFixed = Math.round(tenantFixedAmount * 100)
      landlordFixed = totalMinor - tenantFixed
    }

    onSave({
      name: isCustom ? editableName.trim() : chargeName,
      chargeType,
      amountMinor: totalMinor,
      payer,
      splitMode: payer === 'split' ? splitMode : undefined,
      tenantPercent: tp,
      landlordPercent: 100 - tp,
      tenantFixedMinor: tenantFixed,
      landlordFixedMinor: landlordFixed,
    })
  }

  function handleSwitchType() {
    setChargeType(isFixed ? 'variable' : (defaultType === 'variable' ? 'recurring' : defaultType))
  }

  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency

  return (
    <>
      {/* Editable name for custom charges */}
      {isCustom && (
        <ChargeNameInput
          value={editableName}
          onChange={setEditableName}
          placeholder={t('customChargeNamePlaceholder')}
          autoFocus={!existingConfig}
        />
      )}

      <div className="space-y-4">
        {/* Amount or variable placeholder */}
        {isFixed ? (
          <AmountInput
            amount={amount}
            onAmountChange={setAmount}
            canSave={canSave}
            onSave={handleSave}
            onSwitchType={handleSwitchType}
            switchLabel={t('switchToVariable')}
            switchContext={t('switchToVariableContext')}
            currencySymbol={currencySymbol}
            autoFocus={!isCustom || !!existingConfig}
          />
        ) : (
          <VariablePlaceholder
            onSwitchType={handleSwitchType}
            switchLabel={t('switchToFixed')}
            switchContext={t('switchToFixedContext')}
          />
        )}

        {/* Who pays */}
        <PayerToggle value={payer} onChange={setPayer} />

        {/* Split slider */}
        <Suspense fallback={null}>
          <AnimatedSplitSection show={payer === 'split'}>
            <SplitSlider
              splitMode={splitMode}
              onSplitModeChange={setSplitMode}
              tenantPercent={Number(tenantPercent) || 0}
              onTenantPercentChange={(pct) => setTenantPercent(String(pct))}
              tenantFixedAmount={tenantFixedAmount}
              onTenantFixedAmountChange={setTenantFixedAmount}
              totalAmount={Number(amount?.replace(',', '.') || '0')}
              currencySymbol={currencySymbol}
            />
          </AnimatedSplitSection>
        </Suspense>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Button
          onClick={handleSave}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={!canSave}
        >
          {t('chargeSave')}
        </Button>
        {onToggleActive && (
          <Button
            variant="ghost"
            onClick={onToggleActive}
            className="h-12 w-full rounded-2xl text-muted-foreground"
            size="lg"
          >
            {isActive ? t('pauseCharge') : t('resumeCharge')}
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            onClick={onRemove}
            className="h-12 w-full rounded-2xl text-destructive"
            size="lg"
          >
            {t('removeCharge')}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onSkip}
          className="h-12 w-full rounded-2xl"
          size="lg"
        >
          {t('cancel')}
        </Button>
      </div>
    </>
  )
}
