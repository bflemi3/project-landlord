'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, ArrowLeftRight, X } from 'lucide-react'
import { formatAmount } from '@/lib/format-currency'
import { DUE_DAYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ResponsiveModal } from '@/components/responsive-modal'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOLS: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' }

export interface ChargeConfig {
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  dueDay: number
  payer: 'tenant' | 'landlord' | 'split'
  splitMode?: 'percent' | 'amount'
  tenantPercent: number
  landlordPercent: number
  /** When splitMode is 'amount', these carry the actual minor unit values */
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
  defaultDueDay: number
  currency?: string
  existingConfig?: ChargeConfig | null
  onSave: (config: ChargeConfig) => void
  onSkip: () => void
  /** When editing, optional toggle for pause/resume */
  onToggleActive?: () => void
  /** When editing, optional remove action */
  onRemove?: () => void
  /** Current active state of the charge being edited */
  isActive?: boolean
}

export function ChargeConfigSheet({
  open,
  onOpenChange,
  chargeName,
  isCustom = false,
  defaultType,
  defaultDueDay,
  currency = 'BRL',
  existingConfig,
  onSave,
  onSkip,
  onToggleActive,
  onRemove,
  isActive,
}: ChargeConfigSheetProps) {
  // Key forces remount of the form when the modal opens or the config changes,
  // resetting all state to initial values without useEffect
  const formKey = `${open}-${existingConfig?.name ?? chargeName}-${existingConfig?.amountMinor ?? ''}`

  const isEditing = existingConfig != null
  const title = isEditing
    ? undefined
    : chargeName

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
        defaultDueDay={defaultDueDay}
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
  defaultDueDay,
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
  defaultDueDay: number
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
  const [dueDay, setDueDay] = useState(String(existingConfig?.dueDay ?? defaultDueDay))
  const [payer, setPayer] = useState<'tenant' | 'landlord' | 'split'>(
    existingConfig?.payer ?? 'tenant',
  )
  const [splitMode, setSplitMode] = useState<'percent' | 'amount'>(existingConfig?.splitMode ?? 'percent')
  const [tenantPercent, setTenantPercent] = useState(
    String(existingConfig?.tenantPercent ?? 50),
  )
  // When splitMode is 'amount', this holds the exact tenant amount in major units (e.g., 400 for R$400)
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
      dueDay: Number(dueDay),
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

  return (
    <>
      {/* Editable name for custom charges */}
      {isCustom && (
        <div className="mb-5">
          <input
            type="text"
            value={editableName}
            onChange={(e) => setEditableName(e.target.value)}
            placeholder={t('customChargeNamePlaceholder')}
            className="w-full border-b border-border bg-transparent pb-1 text-xl font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-primary"
            autoFocus
          />
        </div>
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
            currencySymbol={CURRENCY_SYMBOLS[currency] ?? currency}
            autoFocus={!isCustom}
          />
        ) : (
          <VariablePlaceholder
            onSwitchType={handleSwitchType}
            switchLabel={t('switchToFixed')}
            switchContext={t('switchToFixedContext')}
          />
        )}

        {/* Due day + Who pays */}
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <DueDaySelect value={dueDay} onChange={setDueDay} />
          <PayerToggle value={payer} onChange={setPayer} />
        </div>

        {/* Split slider */}
        <AnimatePresence>
          {payer === 'split' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <SplitSlider
                splitMode={splitMode}
                onSplitModeChange={setSplitMode}
                tenantPercent={Number(tenantPercent) || 0}
                onTenantPercentChange={(pct) => setTenantPercent(String(pct))}
                tenantFixedAmount={tenantFixedAmount}
                onTenantFixedAmountChange={setTenantFixedAmount}
                totalAmount={Number(amount?.replace(',', '.') || '0')}
                currencySymbol={CURRENCY_SYMBOLS[currency] ?? currency}
              />
            </motion.div>
          )}
        </AnimatePresence>
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

// =============================================================================
// Amount input — hero currency input for fixed charges
// =============================================================================

function AmountInput({
  amount,
  onAmountChange,
  canSave,
  onSave,
  onSwitchType,
  switchLabel,
  switchContext,
  currencySymbol,
  autoFocus = true,
}: {
  amount: string
  onAmountChange: (value: string) => void
  canSave: boolean
  onSave: () => void
  onSwitchType: () => void
  switchLabel: string
  switchContext: string
  currencySymbol: string
  autoFocus?: boolean
}) {
  return (
    <div className="py-4">
      <div className="group mx-auto max-w-60 border-b-2 border-border pb-2 transition-colors focus-within:border-primary">
        <div className="flex items-baseline justify-center">
          <span className="text-3xl font-bold text-muted-foreground/60 transition-colors group-focus-within:text-primary">{currencySymbol}</span>
          <input
            id="charge-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.,]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) onSave() }}
            className="ml-1 w-0 min-w-[3ch] max-w-32 flex-1 bg-transparent text-left text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/20"
            style={{ width: `${Math.max(3, (amount || '').length + 1)}ch` }}
            autoComplete="off"
            autoFocus={autoFocus}
          />
          {amount && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onAmountChange('')}
              className="ml-1 flex size-5 shrink-0 items-center justify-center self-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <ChargeTypeSwitch context={switchContext} label={switchLabel} onSwitch={onSwitchType} />
    </div>
  )
}

// =============================================================================
// Variable placeholder — upload hint for variable charges
// =============================================================================

function VariablePlaceholder({
  onSwitchType,
  switchLabel,
  switchContext,
}: {
  onSwitchType: () => void
  switchLabel: string
  switchContext: string
}) {
  const t = useTranslations('properties')

  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-400 px-4 py-5 dark:border-zinc-600">
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">{t('variableBillUploadHint')}</p>
      </div>
      <ChargeTypeSwitch context={switchContext} label={switchLabel} onSwitch={onSwitchType} />
    </div>
  )
}

// =============================================================================
// Charge type switch — "or switch to fixed/variable" link
// =============================================================================

function ChargeTypeSwitch({
  context,
  label,
  onSwitch,
}: {
  context: string
  label: string
  onSwitch: () => void
}) {
  return (
    <p className="mt-3 text-center text-xs text-muted-foreground">
      {context}{' '}
      <button
        type="button"
        onClick={onSwitch}
        className="inline-flex items-center gap-1 underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-foreground"
      >
        {label} <ArrowLeftRight className="inline size-3" />
      </button>
    </p>
  )
}

// =============================================================================
// Due day select
// =============================================================================

function DueDaySelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const t = useTranslations('properties')

  return (
    <div>
      <Label className="mb-2">{t('chargeDueDay')}</Label>
      <Select value={value} onValueChange={(val) => onChange(val ?? '10')}>
        <SelectTrigger size="sm" className="w-18">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DUE_DAYS.map((d) => (
            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// =============================================================================
// Payer toggle — tenant / landlord / split segmented control
// =============================================================================

const PAYER_OPTIONS = [
  { value: 'tenant', labelKey: 'chargePaysTenant' },
  { value: 'landlord', labelKey: 'chargePaysLandlord' },
  { value: 'split', labelKey: 'chargePaysSplit' },
] as const

function PayerToggle({
  value,
  onChange,
}: {
  value: 'tenant' | 'landlord' | 'split'
  onChange: (val: 'tenant' | 'landlord' | 'split') => void
}) {
  const t = useTranslations('properties')

  return (
    <div>
      <Label className="mb-2">{t('chargeWhoPays')}</Label>
      <div className="flex h-10 rounded-lg border border-border bg-secondary/50 p-0.5">
        {PAYER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-2 text-xs font-medium transition-colors',
              value === option.value
                ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                : 'text-muted-foreground',
            )}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Split slider — percentage or amount mode with range input
// =============================================================================

function SplitSlider({
  splitMode,
  onSplitModeChange,
  tenantPercent,
  onTenantPercentChange,
  tenantFixedAmount,
  onTenantFixedAmountChange,
  totalAmount,
  currencySymbol,
}: {
  splitMode: 'percent' | 'amount'
  onSplitModeChange: (mode: 'percent' | 'amount') => void
  tenantPercent: number
  onTenantPercentChange: (pct: number) => void
  tenantFixedAmount: number
  onTenantFixedAmountChange: (amount: number) => void
  totalAmount: number
  currencySymbol: string
}) {
  const t = useTranslations('properties')
  const step = 5

  const landlordPercent = 100 - tenantPercent
  const landlordFixedAmount = totalAmount - tenantFixedAmount

  function handleSwitchToAmount() {
    // Snap the current percentage to the nearest $5 step
    const snapped = Math.round((tenantPercent / 100) * totalAmount / step) * step
    onTenantFixedAmountChange(snapped)
    onSplitModeChange('amount')
  }

  function handleSwitchToPercent() {
    // Convert fixed amount back to percentage
    const pct = totalAmount > 0 ? Math.round((tenantFixedAmount / totalAmount) * 100) : 50
    onTenantPercentChange(pct)
    onSplitModeChange('percent')
  }

  return (
    <div className="pt-1">
      {/* Mode toggle */}
      <div className="mb-3 flex justify-end">
        <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
          <button
            type="button"
            onClick={handleSwitchToPercent}
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
              splitMode === 'percent'
                ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                : 'text-muted-foreground',
            )}
          >
            %
          </button>
          <button
            type="button"
            onClick={handleSwitchToAmount}
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
              splitMode === 'amount'
                ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                : 'text-muted-foreground',
            )}
          >
            {currencySymbol}
          </button>
        </div>
      </div>

      {/* Range slider */}
      <div className="px-1">
        {splitMode === 'percent' ? (
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={tenantPercent}
            onChange={(e) => onTenantPercentChange(Number(e.target.value))}
            className="h-2 w-full cursor-default appearance-none rounded-full bg-border outline-none [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
          />
        ) : (
          <input
            type="range"
            min={0}
            max={totalAmount}
            step={step}
            value={tenantFixedAmount}
            onChange={(e) => onTenantFixedAmountChange(Number(e.target.value))}
            className="h-2 w-full cursor-default appearance-none rounded-full bg-border outline-none [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
          />
        )}
      </div>

      {/* Labels */}
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('chargePaysTenant')}{' '}
          <span className="font-semibold text-foreground">
            {splitMode === 'percent' ? `${tenantPercent}%` : formatAmount(tenantFixedAmount)}
          </span>
        </span>
        <span className="text-muted-foreground">
          {t('chargePaysLandlord')}{' '}
          <span className="font-semibold text-foreground">
            {splitMode === 'percent' ? `${landlordPercent}%` : formatAmount(landlordFixedAmount)}
          </span>
        </span>
      </div>
    </div>
  )
}
