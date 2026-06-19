import { describe, it, expect } from 'vitest'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'

import {
  COMMON_EXPENSE_TYPES,
  DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE,
  EXPENSE_AMOUNT_BEHAVIORS,
  EXPENSE_TYPES,
  MORE_EXPENSE_TYPES,
  defaultExpenseRow,
  expenseRowFromContractExpense,
  expenseRowSchema,
  expenseRowWithType,
  isSeedableExtraction,
  type ExpenseAmountBehavior,
  type ExpenseRow,
  type ExpenseType,
} from '../schemas'

function valid(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'demo-id',
    expense_type: 'electricity',
    amount_behavior: 'variable',
    amount_minor: 50_000,
    isExtracted: false,
    ...overrides,
  }
}

function firstIssue(
  result: ReturnType<typeof expenseRowSchema.safeParse>,
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('expenseRowSchema — happy paths', () => {
  it('accepts a complete filled row', () => {
    expect(expenseRowSchema.safeParse(valid()).success).toBe(true)
  })

  it('accepts a typed row with no amount', () => {
    expect(
      expenseRowSchema.safeParse(
        valid({
          expense_type: 'water',
          amount_behavior: 'variable',
          amount_minor: undefined,
        }),
      ).success,
    ).toBe(true)
  })

  it('accepts isExtracted=true', () => {
    expect(expenseRowSchema.safeParse(valid({ isExtracted: true })).success).toBe(true)
  })
})

describe('expenseRowSchema — bookkeeping fields', () => {
  it('rejects an empty id', () => {
    expect(expenseRowSchema.safeParse(valid({ id: '' })).success).toBe(false)
  })

  it('requires isExtracted to be a boolean', () => {
    expect(expenseRowSchema.safeParse({ ...valid(), isExtracted: undefined }).success).toBe(false)
  })
})

describe('expenseRowSchema — expense_type', () => {
  for (const type of EXPENSE_TYPES) {
    it(`accepts "${type}"`, () => {
      expect(
        expenseRowSchema.safeParse(
          valid({
            expense_type: type,
            amount_behavior: DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE[type],
          }),
        ).success,
      ).toBe(true)
    })
  }

  it('rejects null with "required"', () => {
    const r = expenseRowSchema.safeParse(
      valid({
        expense_type: null,
        amount_behavior: null,
        amount_minor: undefined,
      }),
    )
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'expense_type')).toBe('required')
  })

  it('rejects an unknown type with "invalidExpenseType"', () => {
    const r = expenseRowSchema.safeParse(valid({ expense_type: 'rent' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'expense_type')).toBe('invalidExpenseType')
  })
})

describe('expenseRowSchema — amount_behavior', () => {
  for (const behavior of EXPENSE_AMOUNT_BEHAVIORS) {
    it(`accepts "${behavior}"`, () => {
      expect(expenseRowSchema.safeParse(valid({ amount_behavior: behavior })).success).toBe(true)
    })
  }

  it('rejects an unknown behavior with "invalidAmountBehavior"', () => {
    const r = expenseRowSchema.safeParse(valid({ amount_behavior: 'sticky' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_behavior')).toBe('invalidAmountBehavior')
  })

  it('rejects null with "required"', () => {
    const r = expenseRowSchema.safeParse(
      valid({ expense_type: 'electricity', amount_behavior: null }),
    )
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_behavior')).toBe('required')
  })
})

describe('expenseRowSchema — amount_minor', () => {
  it('accepts undefined (optional)', () => {
    expect(expenseRowSchema.safeParse(valid({ amount_minor: undefined })).success).toBe(true)
  })

  it('accepts a positive integer', () => {
    expect(expenseRowSchema.safeParse(valid({ amount_minor: 1 })).success).toBe(true)
  })

  it('accepts MAX_MINOR_UNITS exactly', () => {
    expect(expenseRowSchema.safeParse(valid({ amount_minor: MAX_MINOR_UNITS })).success).toBe(true)
  })

  it('rejects zero with "invalidAmount" (positive only)', () => {
    const r = expenseRowSchema.safeParse(valid({ amount_minor: 0 }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_minor')).toBe('invalidAmount')
  })

  it('rejects a negative number with "invalidAmount"', () => {
    const r = expenseRowSchema.safeParse(valid({ amount_minor: -100 }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_minor')).toBe('invalidAmount')
  })

  it('rejects a non-integer with "invalidAmount"', () => {
    const r = expenseRowSchema.safeParse(valid({ amount_minor: 12.5 }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_minor')).toBe('invalidAmount')
  })

  it('rejects values exceeding MAX_MINOR_UNITS with "tooLarge"', () => {
    const r = expenseRowSchema.safeParse(valid({ amount_minor: MAX_MINOR_UNITS + 1 }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'amount_minor')).toBe('tooLarge')
  })
})

describe('defaultExpenseRow', () => {
  it('returns null for both expense_type and amount_behavior', () => {
    const r = defaultExpenseRow()
    expect(r.expense_type).toBeNull()
    expect(r.amount_behavior).toBeNull()
  })

  it('returns undefined for amount_minor', () => {
    expect(defaultExpenseRow().amount_minor).toBeUndefined()
  })

  it('defaults isExtracted to false', () => {
    expect(defaultExpenseRow().isExtracted).toBe(false)
  })

  it('generates a non-empty id', () => {
    expect(defaultExpenseRow().id.length).toBeGreaterThan(0)
  })

  it('generates a unique id on each call', () => {
    expect(defaultExpenseRow().id).not.toBe(defaultExpenseRow().id)
  })

  it('is schema-invalid until the user picks a type', () => {
    // The slice can hold a null-typed row (freshly added, or extraction-failed
    // classification) but the schema rejects it. This is what drives the
    // per-row "Needs attention" hint and the section-level Continue gate.
    expect(expenseRowSchema.safeParse(defaultExpenseRow()).success).toBe(false)
  })
})

describe('expenseRowWithType', () => {
  it('sets expense_type to the new value', () => {
    const next = expenseRowWithType(defaultExpenseRow(), 'gas')
    expect(next.expense_type).toBe('gas')
  })

  it('seeds amount_behavior from DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE', () => {
    expect(expenseRowWithType(defaultExpenseRow(), 'gas').amount_behavior).toBe('variable')
    expect(expenseRowWithType(defaultExpenseRow(), 'internet').amount_behavior).toBe('fixed')
    expect(expenseRowWithType(defaultExpenseRow(), 'maintenance').amount_behavior).toBe('unknown')
  })

  it('clears amount_minor when switching types', () => {
    const prior: ExpenseRow = {
      id: 'a',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: 9_999,
      isExtracted: false,
    }
    expect(expenseRowWithType(prior, 'condo').amount_minor).toBeUndefined()
  })

  it('preserves id and isExtracted across the type swap', () => {
    const prior: ExpenseRow = {
      id: 'stable-id',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: undefined,
      isExtracted: true,
    }
    const next = expenseRowWithType(prior, 'condo')
    expect(next.id).toBe('stable-id')
    expect(next.isExtracted).toBe(true)
  })

  it('produces a row that parses cleanly against the schema', () => {
    for (const type of EXPENSE_TYPES) {
      const r = expenseRowWithType(defaultExpenseRow(), type)
      expect(expenseRowSchema.safeParse(r).success).toBe(true)
    }
  })
})

describe('expenseRowFromContractExpense', () => {
  it('maps type and derives behavior from the type default', () => {
    const r = expenseRowFromContractExpense({
      type: 'electricity',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(r.expense_type).toBe('electricity')
    expect(r.amount_behavior).toBe('variable')
  })

  it('uses the fixed default for service-plan types', () => {
    const r = expenseRowFromContractExpense({
      type: 'internet',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(r.amount_behavior).toBe('fixed')
  })

  it('produces both null when extracted type is null', () => {
    const r = expenseRowFromContractExpense({
      type: null,
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(r.expense_type).toBeNull()
    expect(r.amount_behavior).toBeNull()
  })

  it('always seeds amount_minor as undefined (extraction never carries it)', () => {
    const r = expenseRowFromContractExpense({
      type: 'water',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(r.amount_minor).toBeUndefined()
  })

  it('marks the row as extracted', () => {
    const r = expenseRowFromContractExpense({
      type: 'gas',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(r.isExtracted).toBe(true)
  })

  it('generates a fresh unique id per call', () => {
    const a = expenseRowFromContractExpense({
      type: 'gas',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    const b = expenseRowFromContractExpense({
      type: 'gas',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(a.id).not.toBe(b.id)
    expect(a.id.length).toBeGreaterThan(0)
  })

  it('produces a row that parses cleanly against the schema', () => {
    const r = expenseRowFromContractExpense({
      type: 'condo',
      bundledInto: null,
      providerName: null,
      providerTaxId: null,
    })
    expect(expenseRowSchema.safeParse(r).success).toBe(true)
  })
})

describe('isSeedableExtraction', () => {
  it('returns true when bundledInto is null', () => {
    expect(
      isSeedableExtraction({
        type: 'electricity',
        bundledInto: null,
        providerName: null,
        providerTaxId: null,
      }),
    ).toBe(true)
  })

  it('returns false when bundled into rent', () => {
    expect(
      isSeedableExtraction({
        type: 'gas',
        bundledInto: 'rent',
        providerName: null,
        providerTaxId: null,
      }),
    ).toBe(false)
  })

  it('returns false when bundled into another expense type', () => {
    expect(
      isSeedableExtraction({
        type: 'water',
        bundledInto: 'condo',
        providerName: null,
        providerTaxId: null,
      }),
    ).toBe(false)
  })
})

describe('constants — internal consistency', () => {
  it('partitions EXPENSE_TYPES into COMMON + MORE without overlap', () => {
    const all = new Set<ExpenseType>(EXPENSE_TYPES)
    const common = new Set<ExpenseType>(COMMON_EXPENSE_TYPES)
    const more = new Set<ExpenseType>(MORE_EXPENSE_TYPES)
    expect(common.size + more.size).toBe(all.size)
    for (const t of common) expect(more.has(t)).toBe(false)
    for (const t of all) expect(common.has(t) || more.has(t)).toBe(true)
  })

  it('has a default amount-behavior for every expense type', () => {
    for (const t of EXPENSE_TYPES) {
      const behavior: ExpenseAmountBehavior = DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE[t]
      expect(EXPENSE_AMOUNT_BEHAVIORS).toContain(behavior)
    }
  })
})
