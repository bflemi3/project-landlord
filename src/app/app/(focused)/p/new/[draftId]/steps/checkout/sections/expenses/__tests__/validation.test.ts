import { describe, expect, it } from 'vitest'

import { defaultExpenseRow, type ExpenseRow } from '../schemas'
import { validateExpenses } from '../validation'

describe('validateExpenses', () => {
  it('returns ok=true and an empty perRow map for an empty list', () => {
    const result = validateExpenses([])
    expect(result.ok).toBe(true)
    expect(result.perRow.size).toBe(0)
  })

  it('returns ok=true with per-row success when every row parses', () => {
    const rows: ExpenseRow[] = [
      {
        ...defaultExpenseRow(),
        expense_type: 'electricity',
        amount_behavior: 'variable',
      },
      {
        ...defaultExpenseRow(),
        expense_type: 'internet',
        amount_behavior: 'fixed',
      },
    ]
    const result = validateExpenses(rows)
    expect(result.ok).toBe(true)
    expect(result.perRow.get(rows[0]!.id)?.success).toBe(true)
    expect(result.perRow.get(rows[1]!.id)?.success).toBe(true)
  })

  it('returns ok=false with the failing row flagged in perRow', () => {
    const valid: ExpenseRow = {
      ...defaultExpenseRow(),
      expense_type: 'electricity',
      amount_behavior: 'variable',
    }
    const invalid = defaultExpenseRow() // expense_type is null → fails schema
    const result = validateExpenses([valid, invalid])
    expect(result.ok).toBe(false)
    expect(result.perRow.get(valid.id)?.success).toBe(true)
    expect(result.perRow.get(invalid.id)?.success).toBe(false)
  })

  it('returns the same cached result for the same array reference', () => {
    const rows: ExpenseRow[] = [defaultExpenseRow()]
    const first = validateExpenses(rows)
    const second = validateExpenses(rows)
    expect(second).toBe(first)
  })

  it('returns a fresh result when the array reference changes (new array, same contents)', () => {
    const a: ExpenseRow[] = [defaultExpenseRow()]
    const b: ExpenseRow[] = [...a]
    const ra = validateExpenses(a)
    const rb = validateExpenses(b)
    expect(rb).not.toBe(ra)
    // Same shape though.
    expect(rb.ok).toBe(ra.ok)
  })
})
