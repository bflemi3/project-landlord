'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RadioCardGroup, radioCardVariants } from '@/components/radio-card-group'
import { cn } from '@/lib/utils'

import { COMMON_EXPENSE_TYPES, MORE_EXPENSE_TYPES, type ExpenseType } from './schemas'
import { EXPENSE_TYPE_ICONS } from './expense-type-icons'

const MORE_TYPE_SET: ReadonlySet<ExpenseType> = new Set(MORE_EXPENSE_TYPES)

// Selected-state classes for the More trigger. The trigger isn't a radio item,
// so it can't lean on `data-checked:` like RadioCardGroup does — we apply the
// primary chrome directly when a More-list type is active. The `dark:` prefix
// matches the specificity-bump pattern in `radioCardVariants` so the primary
// border survives the dark-mode `foreground/15` lift.
const MORE_TRIGGER_SELECTED_CLASSES = cn(
  'border-primary bg-primary-subtle text-primary-subtle-foreground',
  'dark:border-primary dark:bg-primary-subtle dark:text-primary-subtle-foreground',
)

interface ExpenseTypeSelectorProps {
  value: ExpenseType | null
  onValueChange: (value: ExpenseType) => void
}

export function ExpenseTypeSelector({ value, onValueChange }: ExpenseTypeSelectorProps) {
  const t = useTranslations('propertyCreation.checkout.expenses')
  const tOptions = useTranslations('expenseTypes')

  const commonOptions = useMemo(
    () =>
      COMMON_EXPENSE_TYPES.map((type) => ({
        value: type,
        label: tOptions(type),
        icon: EXPENSE_TYPE_ICONS[type],
      })),
    [tOptions],
  )

  // When the selected type lives in the "More" set, the More trigger reflects
  // that choice. Pass `null` to RadioCardGroup so none of the common chips
  // render as selected.
  const moreTypeSelected = value !== null && MORE_TYPE_SET.has(value)
  const SelectedMoreIcon = moreTypeSelected && value ? EXPENSE_TYPE_ICONS[value] : null

  return (
    <div data-slot="expense-type-selector" className="flex flex-col gap-2">
      <RadioCardGroup
        variant="chip"
        options={commonOptions}
        value={moreTypeSelected ? null : value}
        onValueChange={(next) => {
          if (next) onValueChange(next as ExpenseType)
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            radioCardVariants({ variant: 'chip' }),
            'w-full',
            moreTypeSelected && MORE_TRIGGER_SELECTED_CLASSES,
          )}
        >
          {SelectedMoreIcon && value ? (
            <>
              <SelectedMoreIcon className="size-4 shrink-0" />
              <span>{tOptions(value)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t('moreOptions')}</span>
          )}
          <ChevronDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={6}>
          {MORE_EXPENSE_TYPES.map((type) => {
            const Icon = EXPENSE_TYPE_ICONS[type]
            const selected = value === type
            return (
              <DropdownMenuItem
                key={type}
                onClick={() => onValueChange(type)}
                className={cn(
                  selected &&
                    'bg-primary-subtle text-primary-subtle-foreground focus:bg-primary-subtle focus:text-primary-subtle-foreground',
                )}
              >
                <Icon />
                <span>{tOptions(type)}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
