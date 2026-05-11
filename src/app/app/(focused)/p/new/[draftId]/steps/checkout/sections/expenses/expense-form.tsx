'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

import {
  expenseRowWithType,
  type ExpenseAmountBehavior,
  type ExpenseRow,
  type ExpenseType,
} from './schemas'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../../state/use-property-creation'
import { useWizardForm } from '../../../../state/use-wizard-form'
import type { RentDatesInput } from '../rent-dates/schemas'
import { AmountBehaviorSelector } from './amount-behavior-selector'
import { ExpenseTypeSelector } from './expense-type-selector'
import {
  clearFieldFromExpensesServerErrors,
  type ExpensesTouched,
} from './state'
import { validateExpenses } from './validation'

interface ExpenseFormProps {
  id: string
}

export function ExpenseForm({ id }: ExpenseFormProps) {
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const t = useTranslations('propertyCreation.checkout.expenses')
  const { setSectionData, setServerErrors } = usePropertyCreationActions()

  // Row-keyed server errors for this expense. The submit action populates
  // `sectionServerErrors.expenses[rowId]` on failure; merged below at the
  // call site (`errors[field]?.[0] ?? rowServerErrors[field]?.[0]`).
  const rowServerErrors = usePropertyCreationState((s) => {
    const section = s.sectionServerErrors.expenses as
      | Record<string, Record<string, string[]>>
      | undefined
    return section?.[id] ?? {}
  })

  const expense = usePropertyCreationState((s) =>
    (s.sectionData.expenses as ExpenseRow[]).find((row) => row.id === id),
  )
  // Currency anchors on the rent slice.
  const currency = usePropertyCreationState(
    (s) => (s.sectionData['rent-dates'] as RentDatesInput).currency,
  )

  // Touched is keyed by row id within the section's `Record<rowId, Set>`.
  const touchedFields = usePropertyCreationState((s) => {
    const sectionTouched = s.sectionTouched.expenses as ExpensesTouched
    return sectionTouched[id]
  })

  // Cached parse — shared with the row badge and the section's Continue
  // gate. One parse per slice change, regardless of how many consumers.
  const parseResult = usePropertyCreationState(
    (s) => validateExpenses(s.sectionData.expenses as ExpenseRow[]).perRow.get(id)
  )

  const { errors, setTouched } = useWizardForm({
    sectionId: 'expenses',
    parseResult,
    touched: touchedFields,
  })

  // Field-blur helper: append a single field to this row's touched set.
  const touchField = useCallback(
    (field: keyof ExpenseRow) => {
      setTouched<ExpensesTouched>((prev) => {
        if (prev[id]?.has(field)) return prev
        const next = new Set(prev[id] ?? [])
        next.add(field)
        return { ...prev, [id]: next }
      })
    },
    [setTouched, id],
  )

  const setExpenseType = useCallback(
    (next: ExpenseType) => {
      setServerErrors('expenses', clearFieldFromExpensesServerErrors(id, 'expense_type'))
      setSectionData<ExpenseRow[]>('expenses', (prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...expenseRowWithType(row, next), isExtracted: false }
            : row,
        ),
      )
      touchField('expense_type')
    },
    [id, setSectionData, touchField, setServerErrors],
  )

  // Auto-focus the amount field on the first type selection. Effect-based
  // so it runs AFTER the conditionally-rendered `<CurrencyInput>` has
  // mounted (the prior `flushSync` approach forced a synchronous re-render
  // of every Zustand subscriber for what is just a focus side-effect).
  // The ref-tracked previous type covers Strict Mode's double-mount.
  const prevTypeRef = useRef(expense?.expense_type ?? null)
  useEffect(() => {
    const current = expense?.expense_type ?? null
    if (prevTypeRef.current === null && current !== null) {
      amountInputRef.current?.focus()
    }
    prevTypeRef.current = current
  }, [expense?.expense_type])

  const setBehavior = useCallback(
    (next: ExpenseAmountBehavior) => {
      setServerErrors('expenses', clearFieldFromExpensesServerErrors(id, 'amount_behavior'))
      setSectionData<ExpenseRow[]>('expenses', (prev) =>
        prev.map((row) => {
          if (row.id !== id) return row
          const changed = row.amount_behavior !== next
          return {
            ...row,
            amount_behavior: next,
            isExtracted: changed ? false : row.isExtracted,
          }
        }),
      )
      touchField('amount_behavior')
    },
    [id, setSectionData, touchField, setServerErrors],
  )

  const setAmount = useCallback(
    (next: number | undefined) => {
      setServerErrors('expenses', clearFieldFromExpensesServerErrors(id, 'amount_minor'))
      setSectionData<ExpenseRow[]>('expenses', (prev) =>
        prev.map((row) => {
          if (row.id !== id) return row
          const changed = row.amount_minor !== next
          return {
            ...row,
            amount_minor: next,
            isExtracted: changed ? false : row.isExtracted,
          }
        }),
      )
    },
    [id, setSectionData, setServerErrors],
  )

  if (!expense) return null

  const hasType = expense.expense_type !== null
  // `errors` is already touch-gated by the hook. Server-side row errors are
  // always shown when present, so they merge on top of the form's filtered
  // errors — same access pattern as flat sections.
  const typeError = errors.expense_type?.[0] ?? rowServerErrors.expense_type?.[0]
  const amountError = errors.amount_minor?.[0] ?? rowServerErrors.amount_minor?.[0]
  const amountId = `expense-${id}-amount`
  const amountErrorId = `${amountId}-error`

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(typeError) || undefined}>
        <FieldLabel>{t('typeLabel')}</FieldLabel>
        <ExpenseTypeSelector
          value={expense.expense_type}
          onValueChange={setExpenseType}
        />
        {typeError && (
          <FieldError id={`expense-${id}-type-error`}>{t('typeRequired')}</FieldError>
        )}
      </Field>

      {hasType && expense.amount_behavior && (
        <Field>
          <AmountBehaviorSelector
            value={expense.amount_behavior}
            onValueChange={setBehavior}
          />
        </Field>
      )}

      {hasType && (
        <Field data-invalid={Boolean(amountError) || undefined}>
          <FieldLabel htmlFor={amountId}>
            {expense.amount_behavior === 'fixed'
              ? t('amountLabelFixed')
              : t('amountLabel')}
          </FieldLabel>
          <FieldDescription>
            {expense.amount_behavior === 'fixed'
              ? t('amountHelperFixed')
              : expense.amount_behavior === 'variable'
                ? t('amountHelperVariable')
                : t('amountHelperUnknown')}
          </FieldDescription>
          <CurrencyInput
            ref={amountInputRef}
            id={amountId}
            currency={currency}
            value={expense.amount_minor}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? amountErrorId : undefined}
            onValueChange={setAmount}
            onBlur={() => touchField('amount_minor')}
          />
          {amountError && (
            <FieldError id={amountErrorId}>{t(amountError)}</FieldError>
          )}
        </Field>
      )}
    </FieldGroup>
  )
}
