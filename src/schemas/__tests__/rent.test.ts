import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import {
  rentAmountMinorSchema,
  rentDueDayOfMonthSchema,
  rentInputSchema,
  rentIsoDateSchema,
} from '../rent'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    amount_minor: 250_000,
    currency: 'BRL',
    due_day_of_month: 5,
    ...overrides,
  }
}

function fieldErrors(input: unknown) {
  const r = rentInputSchema.safeParse(input)
  if (r.success) return null
  return z.flattenError(r.error).fieldErrors
}

function pathMessages(
  r: ReturnType<typeof rentInputSchema.safeParse>,
  field: string,
): string[] {
  if (r.success) return []
  return r.error.issues
    .filter((i) => i.path[0] === field)
    .map((i) => i.message)
}

// =============================================================================
// Field-level validators (hoisted for the wizard's checkout-local rent-dates)
// =============================================================================

describe('rentAmountMinorSchema', () => {
  it('accepts a positive integer', () => {
    expect(rentAmountMinorSchema.safeParse(100).success).toBe(true)
  })

  it('rejects a float with "invalidAmount"', () => {
    const r = rentAmountMinorSchema.safeParse(100.5)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidAmount')
  })

  it('rejects zero with "invalidAmount"', () => {
    const r = rentAmountMinorSchema.safeParse(0)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidAmount')
  })

  it('rejects negative with "invalidAmount"', () => {
    expect(rentAmountMinorSchema.safeParse(-1).success).toBe(false)
  })

  it('rejects missing input with "required"', () => {
    const r = rentAmountMinorSchema.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('required')
  })
})

describe('rentDueDayOfMonthSchema — boundaries', () => {
  it('accepts 1', () => {
    expect(rentDueDayOfMonthSchema.safeParse(1).success).toBe(true)
  })

  it('accepts 31', () => {
    expect(rentDueDayOfMonthSchema.safeParse(31).success).toBe(true)
  })

  it('rejects 0 with "invalidDueDay"', () => {
    const r = rentDueDayOfMonthSchema.safeParse(0)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidDueDay')
  })

  it('rejects 32 with "invalidDueDay"', () => {
    const r = rentDueDayOfMonthSchema.safeParse(32)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidDueDay')
  })

  it('rejects a non-integer with "invalidDueDay"', () => {
    expect(rentDueDayOfMonthSchema.safeParse(5.5).success).toBe(false)
  })
})

describe('rentIsoDateSchema', () => {
  it('accepts a YYYY-MM-DD string', () => {
    expect(rentIsoDateSchema.safeParse('2026-01-01').success).toBe(true)
  })

  it('rejects a date in another format with "invalidDate"', () => {
    const r = rentIsoDateSchema.safeParse('01/01/2026')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidDate')
  })

  it('rejects an empty string with "invalidDate"', () => {
    const r = rentIsoDateSchema.safeParse('')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('invalidDate')
  })
})

// =============================================================================
// rentInputSchema — happy paths + money model + currency
// =============================================================================

describe('rentInputSchema — happy paths', () => {
  it('accepts a minimal valid input', () => {
    expect(rentInputSchema.safeParse(valid()).success).toBe(true)
  })

  it('applies defaults for nullable fields when omitted', () => {
    const r = rentInputSchema.parse(valid())
    expect(r.start_date).toBeNull()
    expect(r.end_date).toBeNull()
    expect(r.adjustment_method).toBeNull()
    expect(r.adjustment_amount_minor).toBeNull()
    expect(r.adjustment_basis_points).toBeNull()
    expect(r.includes).toBeNull()
  })
})

describe('rentInputSchema — money model', () => {
  it('rejects a float amount_minor', () => {
    const errors = fieldErrors(valid({ amount_minor: 12.5 }))
    expect(errors?.amount_minor).toEqual(['invalidAmount'])
  })

  it('rejects an empty currency with "required"', () => {
    const errors = fieldErrors(valid({ currency: '' }))
    expect(errors?.currency).toEqual(['required'])
  })

  it('rejects a missing amount_minor with "required"', () => {
    const errors = fieldErrors(valid({ amount_minor: undefined }))
    expect(errors?.amount_minor).toContain('required')
  })
})

describe('rentInputSchema — end_date after start_date', () => {
  it('accepts equal start and end dates', () => {
    const r = rentInputSchema.safeParse(
      valid({ start_date: '2026-01-01', end_date: '2026-01-01' }),
    )
    expect(r.success).toBe(true)
  })

  it('accepts end_date after start_date', () => {
    const r = rentInputSchema.safeParse(
      valid({ start_date: '2026-01-01', end_date: '2027-01-01' }),
    )
    expect(r.success).toBe(true)
  })

  it('rejects end_date before start_date with "endDateBeforeStart"', () => {
    const r = rentInputSchema.safeParse(
      valid({ start_date: '2027-01-01', end_date: '2026-01-01' }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'end_date')).toContain('endDateBeforeStart')
  })

  it('does not fire when one date is null', () => {
    expect(
      rentInputSchema.safeParse(valid({ start_date: '2026-01-01' })).success,
    ).toBe(true)
  })
})

// =============================================================================
// refineAdjustmentValueConsistency — matrix over (method × amount × basis_points)
// =============================================================================

describe('rentInputSchema — adjustment value consistency', () => {
  it('fixed_amount with adjustment_amount_minor only → pass', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'fixed_amount', adjustment_amount_minor: 5_000 }),
    )
    expect(r.success).toBe(true)
  })

  it('fixed_amount missing adjustment_amount_minor → "required"', () => {
    const r = rentInputSchema.safeParse(valid({ adjustment_method: 'fixed_amount' }))
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_amount_minor')).toContain('required')
  })

  it('fixed_amount with adjustment_basis_points set → "invalidAdjustmentValue"', () => {
    const r = rentInputSchema.safeParse(
      valid({
        adjustment_method: 'fixed_amount',
        adjustment_amount_minor: 5_000,
        adjustment_basis_points: 500,
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_basis_points')).toContain('invalidAdjustmentValue')
  })

  it('fixed_percentage with adjustment_basis_points only → pass', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'fixed_percentage', adjustment_basis_points: 500 }),
    )
    expect(r.success).toBe(true)
  })

  it('fixed_percentage missing adjustment_basis_points → "required"', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'fixed_percentage' }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_basis_points')).toContain('required')
  })

  it('fixed_percentage with adjustment_amount_minor set → "invalidAdjustmentValue"', () => {
    const r = rentInputSchema.safeParse(
      valid({
        adjustment_method: 'fixed_percentage',
        adjustment_amount_minor: 5_000,
        adjustment_basis_points: 500,
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_amount_minor')).toContain('invalidAdjustmentValue')
  })

  it('index with both null → pass', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'index', adjustment_index: 'IPCA' }),
    )
    expect(r.success).toBe(true)
  })

  it('index with adjustment_amount_minor set → "invalidAdjustmentValue"', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'index', adjustment_amount_minor: 5_000 }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_amount_minor')).toContain('invalidAdjustmentValue')
  })

  it('index with adjustment_basis_points set → "invalidAdjustmentValue"', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: 'index', adjustment_basis_points: 500 }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_basis_points')).toContain('invalidAdjustmentValue')
  })

  it('other with both null → pass', () => {
    const r = rentInputSchema.safeParse(valid({ adjustment_method: 'other' }))
    expect(r.success).toBe(true)
  })

  it('null method with both null → pass (no adjustment clause)', () => {
    const r = rentInputSchema.safeParse(valid({ adjustment_method: null }))
    expect(r.success).toBe(true)
  })

  it('null method with adjustment_amount_minor set → "invalidAdjustmentValue"', () => {
    const r = rentInputSchema.safeParse(
      valid({ adjustment_method: null, adjustment_amount_minor: 5_000 }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, 'adjustment_amount_minor')).toContain('invalidAdjustmentValue')
  })
})

// =============================================================================
// includes — array of expense_type
// =============================================================================

describe('rentInputSchema — includes', () => {
  it('accepts an empty array', () => {
    const r = rentInputSchema.safeParse(valid({ includes: [] }))
    expect(r.success).toBe(true)
  })

  it('accepts a valid expense_type array', () => {
    const r = rentInputSchema.safeParse(
      valid({ includes: ['condo', 'water'] }),
    )
    expect(r.success).toBe(true)
  })

  it('rejects an unknown expense type with "invalidExpenseType"', () => {
    const r = rentInputSchema.safeParse(valid({ includes: ['rent'] }))
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message === 'invalidExpenseType'),
      ).toBe(true)
    }
  })
})
