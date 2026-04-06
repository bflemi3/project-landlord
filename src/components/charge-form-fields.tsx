'use client'

import { useTranslations } from 'next-intl'
import { Upload, ArrowLeftRight, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { formatAmount } from '@/lib/format-currency'
import { cn } from '@/lib/utils'

// =============================================================================
// Amount input — hero currency input for fixed charges
// =============================================================================

export function AmountInput({
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
  onSwitchType?: () => void
  switchLabel?: string
  switchContext?: string
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
      {onSwitchType && switchContext && switchLabel && (
        <ChargeTypeSwitch context={switchContext} label={switchLabel} onSwitch={onSwitchType} />
      )}
    </div>
  )
}

// =============================================================================
// Variable placeholder — upload hint for variable charges
// =============================================================================

export function VariablePlaceholder({
  onSwitchType,
  switchLabel,
  switchContext,
}: {
  onSwitchType?: () => void
  switchLabel?: string
  switchContext?: string
}) {
  const t = useTranslations('properties')

  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-400 px-4 py-5 dark:border-zinc-600">
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">{t('variableBillUploadHint')}</p>
      </div>
      {onSwitchType && switchContext && switchLabel && (
        <ChargeTypeSwitch context={switchContext} label={switchLabel} onSwitch={onSwitchType} />
      )}
    </div>
  )
}

// =============================================================================
// Charge type switch — "or switch to fixed/variable" link
// =============================================================================

export function ChargeTypeSwitch({
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
// Payer toggle — tenant / landlord / split segmented control
// =============================================================================

const PAYER_OPTIONS = [
  { value: 'tenant', labelKey: 'chargePaysTenant' },
  { value: 'landlord', labelKey: 'chargePaysLandlord' },
  { value: 'split', labelKey: 'chargePaysSplit' },
] as const

export function PayerToggle({
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

export function SplitSlider({
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
    const snapped = Math.round((tenantPercent / 100) * totalAmount / step) * step
    onTenantFixedAmountChange(snapped)
    onSplitModeChange('amount')
  }

  function handleSwitchToPercent() {
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
