'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, ArrowLeftRight, X } from 'lucide-react'
import { getSliderConfig, sliderValueToPercent, snapPercentToStep, percentToAmount } from '@/lib/split-utils'
import { formatAmount } from '@/lib/format-currency'
import { DUE_DAYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export interface ChargeConfig {
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  dueDay: number
  payer: 'tenant' | 'landlord' | 'split'
  splitMode?: 'percent' | 'amount'
  tenantPercent: number
  landlordPercent: number
  isCustom?: boolean
}

interface ChargeConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chargeName: string
  isCustom?: boolean
  defaultType: 'rent' | 'recurring' | 'variable'
  defaultDueDay: number
  existingConfig?: ChargeConfig | null
  onSave: (config: ChargeConfig) => void
  onSkip: () => void
}

export function ChargeConfigSheet({
  open,
  onOpenChange,
  chargeName,
  isCustom = false,
  defaultType,
  defaultDueDay,
  existingConfig,
  onSave,
  onSkip,
}: ChargeConfigSheetProps) {
  // 2. Context
  const t = useTranslations('properties')

  // 4. State
  const [editableName, setEditableName] = useState(chargeName)
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

  // 5. Derived
  const isFixed = chargeType === 'rent' || chargeType === 'recurring'
  const canSave = (isFixed ? amount.trim().length > 0 && Number(amount.replace(',', '.')) > 0 : true) && editableName.trim().length > 0

  // 7. Effects
  useEffect(() => {
    if (open) {
      setEditableName(existingConfig?.name ?? chargeName)
      setChargeType(existingConfig?.chargeType ?? defaultType)
      setAmount(existingConfig?.amountMinor ? String(existingConfig.amountMinor / 100) : '')
      setDueDay(String(existingConfig?.dueDay ?? defaultDueDay))
      setPayer(existingConfig?.payer ?? 'tenant')
      setSplitMode(existingConfig?.splitMode ?? 'percent')
      setTenantPercent(String(existingConfig?.tenantPercent ?? 50))
    }
  }, [open, existingConfig, defaultType, defaultDueDay])

  // 8. Callbacks
  function handleSave() {
    const numAmount = Number(amount.replace(',', '.'))
    const tp = payer === 'tenant' ? 100 : payer === 'landlord' ? 0 : Number(tenantPercent) || 50
    onSave({
      name: isCustom ? editableName.trim() : chargeName,
      chargeType,
      amountMinor: isFixed && numAmount ? Math.round(numAmount * 100) : null,
      dueDay: Number(dueDay),
      payer,
      splitMode: payer === 'split' ? splitMode : undefined,
      tenantPercent: tp,
      landlordPercent: 100 - tp,
    })
  }

  // 10. Return
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-6 md:max-w-lg md:mx-auto">
        <SheetHeader className="mb-5">
          {isCustom ? (
            <>
              <SheetTitle className="sr-only">{t('configureCharge', { name: editableName })}</SheetTitle>
              <SheetDescription className="sr-only">{t('configureCharge', { name: editableName })}</SheetDescription>
              <input
                type="text"
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                placeholder={t('customChargeNamePlaceholder')}
                className="w-full border-b border-border bg-transparent pb-1 text-xl font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-primary"
              />
            </>
          ) : (
            <>
              <SheetTitle className="text-xl">{t('configureCharge', { name: chargeName })}</SheetTitle>
              <SheetDescription className="sr-only">{t('configureCharge', { name: chargeName })}</SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="space-y-4">
          {/* Amount — hero for fixed, upload placeholder for variable */}
          {isFixed ? (
            <div className="py-4">
              <div className="group mx-auto max-w-60 border-b-2 border-border pb-2 transition-colors focus-within:border-primary">
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold text-muted-foreground/60 transition-colors group-focus-within:text-primary">R$</span>
                  <input
                    id="charge-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '')
                      setAmount(val)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canSave) handleSave()
                    }}
                    className="ml-1 w-0 min-w-[3ch] max-w-32 flex-1 bg-transparent text-left text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/20"
                    style={{ width: `${Math.max(3, (amount || '').length + 1)}ch` }}
                    autoFocus
                  />
                  {amount && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setAmount('')}
                      className="ml-1 flex size-5 shrink-0 items-center justify-center self-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('switchToVariableContext')}{' '}
                <button
                  type="button"
                  onClick={() => setChargeType('variable')}
                  className="inline-flex items-center gap-1 underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-foreground"
                >
                  {t('switchToVariable')} <ArrowLeftRight className="inline size-3" />
                </button>
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-400 px-4 py-5 dark:border-zinc-600">
                <Upload className="size-5 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">{t('variableBillUploadHint')}</p>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('switchToFixedContext')}{' '}
                <button
                  type="button"
                  onClick={() => setChargeType(defaultType === 'variable' ? 'recurring' : defaultType)}
                  className="inline-flex items-center gap-1 underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-foreground"
                >
                  {t('switchToFixed')} <ArrowLeftRight className="inline size-3" />
                </button>
              </p>
            </div>
          )}

          {/* Due day + Who pays — side by side */}
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <Label className="mb-2">{t('chargeDueDay')}</Label>
              <Select value={dueDay} onValueChange={(val) => setDueDay(val ?? '10')}>
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
            <div>
              <Label className="mb-2">{t('chargeWhoPays')}</Label>
              <div className="flex h-10 rounded-lg border border-border bg-secondary/50 p-0.5">
                {(['tenant', 'landlord', 'split'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayer(p)}
                    className={`flex-1 rounded-md px-2 text-xs font-medium transition-colors ${
                      payer === p
                        ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {t(p === 'tenant' ? 'chargePaysTenant' : p === 'landlord' ? 'chargePaysLandlord' : 'chargePaysSplit')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split slider — animated */}
          <AnimatePresence>
            {payer === 'split' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  {/* Mode toggle */}
                  <div className="mb-3 flex justify-end">
                    <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSplitMode('percent')}

                        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                          splitMode === 'percent'
                            ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                            : 'text-muted-foreground'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const total = Number(amount?.replace(',', '.') || '0')
                          const snapped = snapPercentToStep(Number(tenantPercent) || 0, total, 5)
                          setTenantPercent(String(snapped))
                          setSplitMode('amount')
                        }}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                          splitMode === 'amount'
                            ? 'bg-card text-foreground shadow-sm dark:bg-zinc-700'
                            : 'text-muted-foreground'
                        }`}
                      >
                        R$
                      </button>
                    </div>
                  </div>
                  {/* Slider + Labels */}
                  {(() => {
                    const totalAmount = Number(amount?.replace(',', '.') || '0')
                    const tp = Number(tenantPercent) || 0
                    const lp = 100 - tp
                    const slider = getSliderConfig(splitMode, tp, totalAmount, 5)
                    const tenantAmount = percentToAmount(tp, totalAmount, 5)
                    const landlordAmount = totalAmount - tenantAmount

                    return (
                      <>
                        <div className="px-1">
                          <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={slider.value}
                            onChange={(e) => {
                              const newPct = sliderValueToPercent(Number(e.target.value), splitMode, totalAmount)
                              setTenantPercent(String(newPct))
                            }}
                            className="h-2 w-full cursor-default appearance-none rounded-full bg-border outline-none [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t('chargePaysTenant')}{' '}
                            <span className="font-semibold text-foreground">
                              {splitMode === 'percent'
                                ? `${tp}%`
                                : formatAmount(tenantAmount)}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            {t('chargePaysLandlord')}{' '}
                            <span className="font-semibold text-foreground">
                              {splitMode === 'percent'
                                ? `${lp}%`
                                : formatAmount(landlordAmount)}
                            </span>
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
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
          <Button
            variant="ghost"
            onClick={onSkip}
            className="h-12 w-full rounded-2xl"
            size="lg"
          >
            {t('cancel')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
