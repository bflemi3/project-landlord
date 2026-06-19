import type { PropertyCreationStateShape } from '../../../../state/store'
import { EXPENSE_ROW_FIELD_NAMES, type ExpenseRow } from './schemas'
import { validateExpenses } from './validation'

export type ExpensesTouched = Record<string, ReadonlySet<string>>

/** Server-error slice for this row section. Keyed by stable row `id`, never
 *  index — row delete must not shift other rows' errors. */
export type ExpensesServerErrors = Record<string /* rowId */, Record<string, string[]>>

export function defaultServerErrors(): ExpensesServerErrors {
  return {}
}

export function applyServerErrors(slice: ExpensesServerErrors) {
  return (): ExpensesServerErrors => slice
}

export function clearRowServerErrors(rowId: string) {
  return (prev: ExpensesServerErrors): ExpensesServerErrors => {
    if (prev[rowId] == null) return prev
    const next = { ...prev }
    delete next[rowId]
    return next
  }
}

export function clearFieldServerError(rowId: string, field: string) {
  return (prev: ExpensesServerErrors): ExpensesServerErrors => {
    const row = prev[rowId]
    if (!row || row[field] == null) return prev
    const nextRow = { ...row }
    delete nextRow[field]
    if (Object.keys(nextRow).length === 0) {
      const next = { ...prev }
      delete next[rowId]
      return next
    }
    return { ...prev, [rowId]: nextRow }
  }
}

export function isValid(state: PropertyCreationStateShape): boolean {
  return validateExpenses(state.sectionData.expenses as ExpenseRow[]).ok
}

export function isDefault(slice: ExpenseRow[] | undefined): boolean {
  return !slice || slice.length === 0
}

export function defaultTouched(): ExpensesTouched {
  return {}
}

export function setAllTouched(
  prev: ExpensesTouched,
  sectionData: ExpenseRow[] | undefined,
): ExpensesTouched {
  if (!sectionData || sectionData.length === 0) return prev
  let changed = false
  const next: ExpensesTouched = { ...prev }
  for (const row of sectionData) {
    const existing = next[row.id]
    if (existing && EXPENSE_ROW_FIELD_NAMES.every((f) => existing.has(f))) continue
    next[row.id] = new Set(EXPENSE_ROW_FIELD_NAMES)
    changed = true
  }
  return changed ? next : prev
}
