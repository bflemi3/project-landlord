// Cached per-section validation. The store's slice reference is stable
// across renders that didn't mutate the slice, so a `WeakMap<slice, result>`
// cache means one `safeParse` per slice change regardless of how many
// consumers (top-bar, mobile-bar, summary, section status, per-row badge,
// Continue gate) read the validation result.

import { expenseRowSchema, type ExpenseRow } from './schemas'

export type ExpenseRowParse = ReturnType<typeof expenseRowSchema.safeParse>

export interface ExpensesValidation {
  ok: boolean
  perRow: ReadonlyMap<string, ExpenseRowParse>
}

const cache = new WeakMap<readonly ExpenseRow[], ExpensesValidation>()

export function validateExpenses(
  rows: readonly ExpenseRow[],
): ExpensesValidation {
  const cached = cache.get(rows)
  if (cached) return cached
  const perRow = new Map<string, ExpenseRowParse>()
  let ok = true
  for (const row of rows) {
    const result = expenseRowSchema.safeParse(row)
    perRow.set(row.id, result)
    if (!result.success) ok = false
  }
  const validation: ExpensesValidation = { ok, perRow }
  cache.set(rows, validation)
  return validation
}
