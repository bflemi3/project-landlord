'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { useTranslations } from 'next-intl'
import { AlertCircle, Trash2 } from 'lucide-react'

import { AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format-currency'
import { cn } from '@/lib/utils'

import { type ExpenseRow as ExpenseRowType } from './schemas'
import type { RentDatesInput } from '../rent-dates/schemas'
import { usePropertyCreationState } from '../../../../state/use-property-creation'
import { ExpenseForm } from './expense-form'
import { AutoFilledIcon } from '../auto-filled-indicator'
import { RowTrailingStatus } from '../row-trailing-status'
import { type ExpensesTouched } from './state'
import { validateExpenses } from './validation'
import { EXPENSE_TYPE_FALLBACK_ICON, EXPENSE_TYPE_ICONS } from './expense-type-icons'

interface ExpenseRowProps {
  id: string
  isRemoving: boolean
  /** Forwarded to the underlying AccordionItem so just-added rows fade in. */
  animateEntrance?: boolean
  onRemove: () => void
}

export function ExpenseRow({ id, isRemoving, animateEntrance, onRemove }: ExpenseRowProps) {
  const t = useTranslations('propertyCreation.checkout.expenses')
  const tOptions = useTranslations('propertyCreation.checkout.expenses.typeOptions')

  // Subscribe to the row reference only — `find()` keeps a stable ref while
  // this row's data is unchanged, so unrelated row edits don't re-render us.
  const expense = usePropertyCreationState((s) =>
    (s.sectionData.expenses as ExpenseRowType[]).find((row) => row.id === id),
  )
  // Currency anchors on the rent slice.
  const currency = usePropertyCreationState(
    (s) => (s.sectionData['rent-dates'] as RentDatesInput).currency,
  )

  // Validity selector reads the cache inside the selector and returns a
  // boolean — Zustand only re-renders when the boolean flips. Cache hit
  // is O(1) so the selector cost is dominated by `Object.is` on the result.
  const isValid = usePropertyCreationState(
    (s) =>
      validateExpenses(s.sectionData.expenses as ExpenseRowType[]).perRow.get(id)?.success ?? true,
  )

  const isTouched = usePropertyCreationState(
    (s) => ((s.sectionTouched.expenses as ExpensesTouched)[id]?.size ?? 0) > 0,
  )

  if (!expense) return null

  const TriggerIcon =
    expense.expense_type !== null
      ? EXPENSE_TYPE_ICONS[expense.expense_type]
      : EXPENSE_TYPE_FALLBACK_ICON
  const triggerLabel =
    expense.expense_type !== null ? tOptions(expense.expense_type) : t('newExpense')

  return (
    <AccordionItem
      value={id}
      isRemoving={isRemoving}
      animateEntrance={animateEntrance}
      data-slot="expense-row"
    >
      <AccordionPrimitive.Header className="flex w-full min-w-0 items-center gap-2">
        <AccordionPrimitive.Trigger
          data-slot="expense-row-trigger"
          className={cn(
            'focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-3 text-left text-sm font-medium outline-none focus-visible:ring-3',
            'text-foreground',
          )}
        >
          <TriggerIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0',
              expense.expense_type === null && 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1.5',
              expense.expense_type === null && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            {expense.isExtracted && <AutoFilledIcon className="shrink-0" />}
          </span>
          <RowSummary
            showInvalid={!isValid && isTouched}
            amountMinor={expense.amount_minor}
            currency={currency}
          />
        </AccordionPrimitive.Trigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t('removeAriaLabel')}
          className="hover:not-disabled:bg-destructive/10 hover:not-disabled:text-destructive"
        >
          <Trash2 />
        </Button>
      </AccordionPrimitive.Header>
      <AccordionContent className="p-4">
        <ExpenseForm id={id} />
      </AccordionContent>
    </AccordionItem>
  )
}

// Status takes priority over amount on the trailing edge of the collapsed row.
function RowSummary({
  showInvalid,
  amountMinor,
  currency,
}: {
  showInvalid: boolean
  amountMinor: number | undefined
  currency: string
}) {
  const t = useTranslations('propertyCreation.checkout.expenses')

  if (showInvalid) {
    return (
      <RowTrailingStatus icon={AlertCircle} tone="destructive">
        {t('summaryNeedsAttention')}
      </RowTrailingStatus>
    )
  }

  if (amountMinor !== undefined && amountMinor > 0) {
    return (
      <RowTrailingStatus tone="muted" variant="data">
        {formatCurrency(amountMinor, currency)}
      </RowTrailingStatus>
    )
  }

  return null
}
