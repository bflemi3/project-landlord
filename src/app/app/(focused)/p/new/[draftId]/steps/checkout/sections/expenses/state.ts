import type { PropertyCreationStateShape } from '../../../../state/store'
import {
  EXPENSE_ROW_FIELD_NAMES,
  type ExpenseRow,
} from './schemas'
import { validateExpenses } from './validation'

export type ExpensesTouched = Record<string, ReadonlySet<string>>

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
