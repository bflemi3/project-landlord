'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Activity,
  ChevronDown,
  HelpCircle,
  Repeat,
  type LucideIcon,
} from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import type { ExpenseAmountBehavior } from './schemas'

const BEHAVIOR_ORDER: readonly ExpenseAmountBehavior[] = [
  'fixed',
  'variable',
  'unknown',
]

const BEHAVIOR_ICONS: Record<ExpenseAmountBehavior, LucideIcon> = {
  fixed: Repeat,
  variable: Activity,
  unknown: HelpCircle,
}

interface AmountBehaviorSelectorProps {
  value: ExpenseAmountBehavior
  onValueChange: (value: ExpenseAmountBehavior) => void
}

/**
 * Quiet annotation line under the type chips. Reads as a sentence describing
 * the inferred billing pattern; tapping opens a Popover where the user can
 * override. Designed to be visually subordinate to the type selector — the
 * default is right ~95% of the time, so this control occupies "hint" weight,
 * not "form field" weight.
 */
export function AmountBehaviorSelector({
  value,
  onValueChange,
}: AmountBehaviorSelectorProps) {
  const t = useTranslations(
    'propertyCreation.checkout.expenses.amountBehavior',
  )
  const Icon = BEHAVIOR_ICONS[value]
  // Controlled so we can close the popover after selection — base-ui's
  // Popover doesn't auto-close on inner button clicks (only on outside
  // click / Esc), and a picker should snap shut once the user has chosen.
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('changeAriaLabel')}
        className={cn(
          'flex w-fit items-center gap-2 rounded-md py-1 pr-2 text-left text-sm outline-none',
          'text-muted-foreground hover:text-foreground transition-colors',
          'focus-visible:ring-ring/50 focus-visible:ring-3',
        )}
      >
        <Icon aria-hidden className="text-foreground size-4 shrink-0" />
        <span className="text-foreground font-medium">{t(`${value}Label`)}</span>
        <span aria-hidden>·</span>
        <span>{t(`${value}Trigger`)}</span>
        <ChevronDown aria-hidden className="size-3 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 p-2">
        <ul role="radiogroup" className="flex flex-col gap-1">
          {BEHAVIOR_ORDER.map((behavior) => {
            const ItemIcon = BEHAVIOR_ICONS[behavior]
            const selected = value === behavior
            return (
              <li key={behavior}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    onValueChange(behavior)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md p-3 text-left outline-none transition-colors',
                    'hover:bg-accent focus-visible:bg-accent',
                    selected &&
                      'bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle focus-visible:bg-primary-subtle',
                  )}
                >
                  <ItemIcon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {t(`${behavior}Label`)}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        !selected && 'text-muted-foreground',
                      )}
                    >
                      {t(`${behavior}Description`)}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
