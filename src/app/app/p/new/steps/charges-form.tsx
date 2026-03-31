'use client'

import { useState, useEffect, useRef, type MutableRefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Home, Building2, Zap, Droplets, Flame, Wifi, Plus, X, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  ChargeRow,
  ChargeRowIcon,
  ChargeRowContent,
  ChargeRowTitle,
  ChargeRowDescription,
  ChargeRowAmount,
  ChargeRowActions,
  ChargeRowRemove,
  ChargeRowChevron,
} from '@/components/charge-row'
import { formatCurrency, formatAmount } from '@/lib/format-currency'
import { DUE_DAYS } from '@/lib/constants'
import { ChargeConfigSheet, type ChargeConfig } from './charge-config-sheet'

interface ChargeEntry {
  id: string
  displayName: string
  i18nKey?: string
  icon: React.ElementType
  defaultType: 'rent' | 'recurring' | 'variable'
  isCustom: boolean
}

const PRESET_CHARGES: ChargeEntry[] = [
  { id: 'rent', displayName: '', i18nKey: 'chargeRent', icon: Home, defaultType: 'rent', isCustom: false },
  { id: 'condo', displayName: '', i18nKey: 'chargeCondo', icon: Building2, defaultType: 'recurring', isCustom: false },
  { id: 'electric', displayName: '', i18nKey: 'chargeElectric', icon: Zap, defaultType: 'variable', isCustom: false },
  { id: 'water', displayName: '', i18nKey: 'chargeWater', icon: Droplets, defaultType: 'variable', isCustom: false },
  { id: 'gas', displayName: '', i18nKey: 'chargeGas', icon: Flame, defaultType: 'variable', isCustom: false },
  { id: 'internet', displayName: '', i18nKey: 'chargeInternet', icon: Wifi, defaultType: 'recurring', isCustom: false },
]

export interface ChargeData {
  configs: ChargeConfig[]
}

export function ChargesForm({
  onSubmit,
  isSubmitting,
  initialConfigs,
  stateRef,
  dueDayRef,
}: {
  onSubmit: (data: ChargeData) => void
  isSubmitting: boolean
  initialConfigs?: ChargeConfig[]
  stateRef?: MutableRefObject<ChargeConfig[]>
  dueDayRef?: MutableRefObject<string>
}) {
  // 2. Context
  const t = useTranslations('properties')

  // 4. State
  const [dueDay, _setDueDay] = useState(dueDayRef?.current ?? '10')
  function setDueDay(val: string) {
    _setDueDay(val)
    if (dueDayRef) dueDayRef.current = val
  }
  const [configuredCharges, _setConfiguredCharges] = useState<Map<string, ChargeConfig>>(() => {
    if (!initialConfigs?.length) return new Map()
    return new Map(initialConfigs.map((c) => [c.name, c]))
  })
  // Wrap setter to keep parent ref in sync
  function setConfiguredCharges(update: Map<string, ChargeConfig> | ((prev: Map<string, ChargeConfig>) => Map<string, ChargeConfig>)) {
    _setConfiguredCharges((prev) => {
      const next = typeof update === 'function' ? update(prev) : update
      if (stateRef) stateRef.current = Array.from(next.values())
      return next
    })
  }
  const [activeCharge, setActiveCharge] = useState<{ name: string; defaultType: 'rent' | 'recurring' | 'variable'; isCustom: boolean } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [customCharges, setCustomCharges] = useState<ChargeEntry[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  const [dueDayApplied, setDueDayApplied] = useState(false)

  // 5. Derived
  const hasConfigured = configuredCharges.size > 0
  const allCharges = [...PRESET_CHARGES, ...customCharges]

  // 7. Effects
  // #8: When global due day changes, update charges that still match the old default
  const prevDueDayRef = useRef(dueDay)
  useEffect(() => {
    if (configuredCharges.size === 0) {
      prevDueDayRef.current = dueDay
      return
    }
    const oldDay = Number(prevDueDayRef.current)
    const newDay = Number(dueDay)
    prevDueDayRef.current = dueDay
    if (oldDay === newDay) return

    setConfiguredCharges((prev) => {
      const next = new Map(prev)
      let changed = false
      for (const [key, config] of next) {
        // Only update charges that matched the old global default
        if (config.dueDay === oldDay) {
          next.set(key, { ...config, dueDay: newDay })
          changed = true
        }
      }
      return changed ? next : prev
    })
    setDueDayApplied(true)
    const timer = setTimeout(() => setDueDayApplied(false), 2000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when dueDay changes
  }, [dueDay])

  // 8. Callbacks
  function handleDueDayChange(val: string | null) {
    setDueDay(val ?? '10')
  }

  function handleChargeTap(charge: ChargeEntry) {
    const name = getChargeName(charge)
    setActiveCharge({ name, defaultType: charge.defaultType, isCustom: charge.isCustom })
    setSheetOpen(true)
  }

  function handleSaveCharge(config: ChargeConfig) {
    setConfiguredCharges((prev) => {
      const next = new Map(prev)
      // If the name changed (custom charge renamed), remove old key
      if (activeCharge && config.name !== activeCharge.name) {
        next.delete(activeCharge.name)
        // Also update the custom charge entry's displayName
        setCustomCharges((cs) =>
          cs.map((c) => c.displayName === activeCharge.name ? { ...c, displayName: config.name } : c),
        )
      }
      next.set(config.name, config)
      return next
    })
    setSheetOpen(false)
    setActiveCharge(null)
  }

  function handleSkipCharge() {
    setSheetOpen(false)
    setActiveCharge(null)
  }

  function handleRemoveCharge(name: string, isCustom: boolean) {
    setConfiguredCharges((prev) => {
      const next = new Map(prev)
      next.delete(name)
      return next
    })
    if (isCustom) {
      setCustomCharges((prev) => prev.filter((c) => c.displayName !== name))
    }
  }

  function handleAddCustom() {
    const name = customName.trim()
    if (!name) return
    const entry: ChargeEntry = {
      id: `custom_${Date.now()}`,
      displayName: name,
      icon: Settings2,
      defaultType: 'recurring',
      isCustom: true,
    }
    setCustomCharges((prev) => [...prev, entry])
    setActiveCharge({ name, defaultType: 'recurring', isCustom: true })
    setSheetOpen(true)
    setCustomName('')
    setShowCustomInput(false)
  }

  function handleSubmit() {
    onSubmit({ configs: Array.from(configuredCharges.values()) })
  }

  function handleSkip() {
    onSubmit({ configs: [] })
  }

  // 9. Render helpers
  function getChargeName(charge: ChargeEntry): string {
    return charge.i18nKey ? t(charge.i18nKey) : charge.displayName
  }

  // 10. Return
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{t('chargesTitle')}</h1>
      <p className="mb-6 text-base text-muted-foreground">{t('chargesDescription')}</p>

      {/* Default due day */}
      <div className="mb-6">
        <div className="relative mb-2">
          <Label>{t('dueDay')}</Label>
          {dueDayApplied && hasConfigured && (
            <span className="absolute right-0 top-0 text-xs text-primary animate-in fade-in duration-200">
              {t('dueDayApplied')}
            </span>
          )}
        </div>
        <Select value={dueDay} onValueChange={handleDueDayChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DUE_DAYS.map((d) => (
              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charge list */}
      <div className="space-y-2">
        {allCharges.map((charge) => {
          const name = getChargeName(charge)
          const config = configuredCharges.get(name)
          const Icon = charge.icon
          const isConfigured = !!config

          return (
            <ChargeRow
              key={charge.id}
              configured={isConfigured}
              disabled={isSubmitting}
              onClick={() => handleChargeTap(charge)}
            >
              <ChargeRowIcon className={isConfigured ? 'bg-primary/10 text-primary' : undefined}>
                <Icon className="size-4" />
              </ChargeRowIcon>
              <ChargeRowContent>
                <ChargeRowTitle>{name}</ChargeRowTitle>
                {isConfigured && (
                  <ChargeRowDescription>
                    {t('chargeDueDay')} {config.dueDay} · {config.payer === 'tenant'
                      ? t('chargePaysTenant')
                      : config.payer === 'landlord'
                        ? t('chargePaysLandlord')
                        : config.splitMode === 'amount' && config.tenantFixedMinor != null && config.landlordFixedMinor != null
                          ? `${formatCurrency(config.tenantFixedMinor)} / ${formatCurrency(config.landlordFixedMinor)}`
                          : `${config.tenantPercent}/${config.landlordPercent}`}
                  </ChargeRowDescription>
                )}
              </ChargeRowContent>
              {isConfigured ? (
                <ChargeRowActions>
                  <ChargeRowAmount>
                    {config.amountMinor
                      ? formatCurrency(config.amountMinor)
                      : t('chargeVariable')}
                  </ChargeRowAmount>
                  <ChargeRowRemove onClick={() => handleRemoveCharge(name, charge.isCustom)} disabled={isSubmitting} />
                </ChargeRowActions>
              ) : (
                <ChargeRowChevron />
              )}
            </ChargeRow>
          )
        })}
      </div>

      {/* Add custom charge — raw input is intentional here: the plus button
          is positioned absolutely inside the input, which conflicts with the
          Input component's relative wrapper and clear button. */}
      {showCustomInput ? (
        <div className="relative mt-3">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom()
              if (e.key === 'Escape') { setShowCustomInput(false); setCustomName('') }
            }}
            placeholder={t('customChargeNamePlaceholder')}
            className="h-12 w-full rounded-2xl border border-input bg-transparent px-4 pr-12 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-800"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customName.trim()}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustomInput(true)}
          className="mt-3 self-start text-primary text-base md:text-sm"
          disabled={isSubmitting}
        >
          <Plus />
          {t('addCustomCharge')}
        </Button>
      )}

      {/* Charge config sheet */}
      {activeCharge && (
        <ChargeConfigSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          chargeName={activeCharge.name}
          isCustom={activeCharge.isCustom}
          defaultType={activeCharge.defaultType}
          defaultDueDay={Number(dueDay)}
          existingConfig={configuredCharges.get(activeCharge.name) ?? null}
          onSave={handleSaveCharge}
          onSkip={handleSkipCharge}
        />
      )}

      {/* Actions — pushed to bottom */}
      <div className="mt-auto space-y-3 pt-8">
        {hasConfigured && (
          <Button
            onClick={handleSubmit}
            className="h-12 w-full rounded-2xl"
            size="lg"
            loading={isSubmitting}
          >
            {t('createProperty')}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={isSubmitting}
        >
          {t('skipForNow')}
        </Button>
      </div>
    </div>
  )
}
