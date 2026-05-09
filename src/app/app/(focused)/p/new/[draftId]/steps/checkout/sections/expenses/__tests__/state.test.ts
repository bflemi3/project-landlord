import { describe, expect, it } from 'vitest'

import { defaultExpenseRow, type ExpenseRow } from '../schemas'
import { isDefault, setAllTouched } from '../state'

describe('expenses/state — setAllTouched', () => {
  it('returns prev when sectionData is empty (no rows to mark)', () => {
    const prev = {}
    expect(setAllTouched(prev, [])).toBe(prev)
  })

  it('returns prev when sectionData is undefined', () => {
    const prev = {}
    expect(setAllTouched(prev, undefined)).toBe(prev)
  })

  it('builds a Record<rowId, Set<field>> for each row', () => {
    const row: ExpenseRow = defaultExpenseRow()
    const next = setAllTouched({}, [row])
    expect(next[row.id]).toBeInstanceOf(Set)
    expect(next[row.id]?.has('expense_type')).toBe(true)
    expect(next[row.id]?.has('amount_behavior')).toBe(true)
    expect(next[row.id]?.has('amount_minor')).toBe(true)
  })

  it('short-circuits when every row already has every field touched (returns same ref)', () => {
    const row: ExpenseRow = defaultExpenseRow()
    const populated = setAllTouched({}, [row])
    expect(setAllTouched(populated, [row])).toBe(populated)
  })
})

describe('expenses/state — isDefault', () => {
  it('returns true for undefined slice', () => {
    expect(isDefault(undefined)).toBe(true)
  })

  it('returns true for an empty list', () => {
    expect(isDefault([])).toBe(true)
  })

  it('returns false when at least one row is present', () => {
    expect(isDefault([defaultExpenseRow()])).toBe(false)
  })
})
