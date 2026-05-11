// Checkout-local Zod schema for expense rows. No country dispatcher: nothing
// on the row is country-specific (currency anchors on rent, no tax-id/postal).
// See docs/superpowers/specs/2026-05-06-expenses-checkout-architecture-guideposts.md.

import { z } from 'zod'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'
import type { ContractExpense } from '@/lib/contract-extraction/types'
import {
  EXPENSE_AMOUNT_BEHAVIORS as CANONICAL_EXPENSE_AMOUNT_BEHAVIORS,
  EXPENSE_TYPES as CANONICAL_EXPENSE_TYPES,
  expenseAmountBehaviorSchema,
  expenseTypeSchema,
  type ExpenseAmountBehavior,
  type ExpenseType,
} from '@/schemas/expense'

// Re-export the canonical enum-derived arrays so the rest of the wizard
// (selector components, taxonomy maps, tests) can import them from this
// section file without reaching across the codebase. Single source of truth
// stays at `@/schemas/expense`.
export const EXPENSE_TYPES = CANONICAL_EXPENSE_TYPES
export const EXPENSE_AMOUNT_BEHAVIORS = CANONICAL_EXPENSE_AMOUNT_BEHAVIORS
export type { ExpenseType, ExpenseAmountBehavior }

/** Primary chips, ordered by universality in BR rentals. */
export const COMMON_EXPENSE_TYPES = [
  'electricity',
  'water',
  'gas',
  'internet',
  'condo',
  'trash',
] as const satisfies readonly ExpenseType[]

/** Surfaced under the "More" affordance — niche, regionally bundled, or fallback. */
export const MORE_EXPENSE_TYPES = [
  'sewer',
  'cable',
  'insurance',
  'maintenance',
  'other',
] as const satisfies readonly ExpenseType[]

/** Switching `expense_type` always re-anchors `amount_behavior` to this map
 *  — no sticky overrides, the user re-confirms intent by picking a new type. */
export const DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE: Record<
  ExpenseType,
  ExpenseAmountBehavior
> = {
  electricity: 'variable',
  water: 'variable',
  gas: 'variable',
  sewer: 'variable',
  internet: 'fixed',
  condo: 'fixed',
  cable: 'fixed',
  insurance: 'fixed',
  trash: 'fixed',
  maintenance: 'unknown',
  other: 'unknown',
}

// `expense_type` and `amount_behavior` accept `null` at the type level (the
// slice holds null for freshly-added rows and contract-extracted rows the LLM
// couldn't classify) but the schema rejects null — Continue stays gated until
// the user picks one. The base canonical schemas reject empty/null; the
// wizard wraps them in `.nullable().superRefine(...)` so the section can
// store `null` as the "not yet picked" state without coercion.
const expenseTypeField = expenseTypeSchema
  .nullable()
  .superRefine((value, ctx) => {
    if (value === null) {
      ctx.addIssue({ code: 'custom', message: 'required' })
    }
  })

const amountBehaviorField = expenseAmountBehaviorSchema
  .nullable()
  .superRefine((value, ctx) => {
    if (value === null) {
      ctx.addIssue({ code: 'custom', message: 'required' })
    }
  })

// `undefined` (not `null`) matches `rent-dates.amount_minor` so CurrencyInput's
// value type lines up without coercion.
const amountMinorField = z
  .number({ error: 'required' })
  .int({ error: 'invalidAmount' })
  .positive({ error: 'invalidAmount' })
  .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
  .optional()

export const expenseRowSchema = z.object({
  id: z.string().min(1, { error: 'required' }),
  expense_type: expenseTypeField,
  amount_behavior: amountBehaviorField,
  amount_minor: amountMinorField,
  isExtracted: z.boolean(),
})

export type ExpenseRow = z.infer<typeof expenseRowSchema>

/** Field names derived from the schema's shape — single source of truth
 *  for the expenses section's touched logic. */
export const EXPENSE_ROW_FIELD_NAMES = Object.keys(
  expenseRowSchema.shape,
) as readonly (keyof ExpenseRow)[]

export function defaultExpenseRow(): ExpenseRow {
  return {
    id: crypto.randomUUID(),
    expense_type: null,
    amount_behavior: null,
    amount_minor: undefined,
    isExtracted: false,
  }
}

/** Re-derives `amount_behavior` and clears `amount_minor` on type change —
 *  picking a new type means the user is re-anchoring intent. */
export function expenseRowWithType(
  row: ExpenseRow,
  next: ExpenseType,
): ExpenseRow {
  return {
    ...row,
    expense_type: next,
    amount_behavior: DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE[next],
    amount_minor: undefined,
  }
}

/** Seeds an ExpenseRow from a contract-extracted expense. Caller filters
 *  bundled expenses via `isSeedableExtraction` (bundling UI + schema fields
 *  arrive in Phase 1C task 8). */
export function expenseRowFromContractExpense(
  extracted: ContractExpense,
): ExpenseRow {
  return {
    id: crypto.randomUUID(),
    expense_type: extracted.type,
    amount_behavior:
      extracted.type !== null
        ? DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE[extracted.type]
        : null,
    amount_minor: undefined,
    isExtracted: true,
  }
}

/** Bundled expenses get filtered until Phase 1C task 8 lands bundling. */
export function isSeedableExtraction(extracted: ContractExpense): boolean {
  return extracted.bundledInto === null
}
