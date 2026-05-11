import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import {
  EXPENSE_AMOUNT_BEHAVIORS,
  EXPENSE_TYPES,
  expenseAmountBehaviorSchema,
  expenseRowSchema,
  expenseTypeSchema,
} from '../expense'

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Electricity',
    expense_type: 'electricity' as const,
    amount_behavior: 'variable' as const,
    amount_minor: 12_345,
    currency: 'BRL',
    ...overrides,
  }
}

function fieldErrors(input: unknown) {
  const r = expenseRowSchema.safeParse(input)
  if (r.success) return null
  return z.flattenError(r.error).fieldErrors
}

const VALID_UUID = 'a1b2c3d4-1234-4567-89ab-cdef01234567'

// =============================================================================
// expenseTypeSchema / expenseAmountBehaviorSchema — database-derived enums
// =============================================================================

describe('expenseTypeSchema', () => {
  it('includes every value the DB enum carries', () => {
    expect(EXPENSE_TYPES).toContain('electricity')
    expect(EXPENSE_TYPES).toContain('water')
    expect(EXPENSE_TYPES).toContain('insurance')
    expect(EXPENSE_TYPES).toContain('other')
  })

  it('accepts every enum value', () => {
    for (const value of EXPENSE_TYPES) {
      expect(expenseTypeSchema.safeParse(value).success).toBe(true)
    }
  })

  it('rejects an unknown string with "invalidExpenseType"', () => {
    const r = expenseTypeSchema.safeParse('not-a-type')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('invalidExpenseType')
    }
  })

  it('rejects null', () => {
    expect(expenseTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('expenseAmountBehaviorSchema', () => {
  it('includes fixed, variable, unknown', () => {
    expect(EXPENSE_AMOUNT_BEHAVIORS).toEqual(['fixed', 'variable', 'unknown'])
  })

  it('accepts every enum value', () => {
    for (const value of EXPENSE_AMOUNT_BEHAVIORS) {
      expect(expenseAmountBehaviorSchema.safeParse(value).success).toBe(true)
    }
  })

  it('rejects an unknown string with "invalidAmountBehavior"', () => {
    const r = expenseAmountBehaviorSchema.safeParse('sometimes')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('invalidAmountBehavior')
    }
  })
})

// =============================================================================
// expenseRowSchema — required fields + structural rules
// =============================================================================

describe('expenseRowSchema — happy paths', () => {
  it('accepts a valid row', () => {
    const r = expenseRowSchema.safeParse(validRow())
    expect(r.success).toBe(true)
  })

  it('accepts amount_minor = null (placeholder row)', () => {
    const r = expenseRowSchema.safeParse(validRow({ amount_minor: null }))
    expect(r.success).toBe(true)
  })

  it('applies defaults for provider fields when omitted', () => {
    const r = expenseRowSchema.parse({
      name: 'Electricity',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: 100,
      currency: 'BRL',
    })
    expect(r.provider_profile_id).toBeNull()
    expect(r.provider_request_draft_index).toBeNull()
  })
})

describe('expenseRowSchema — required-field errors', () => {
  it('flags empty name with "required"', () => {
    const errors = fieldErrors(validRow({ name: '' }))
    expect(errors?.name).toEqual(['required'])
  })

  it('flags name longer than 200 chars with "tooLong"', () => {
    const errors = fieldErrors(validRow({ name: 'a'.repeat(201) }))
    expect(errors?.name).toEqual(['tooLong'])
  })

  it('flags missing expense_type', () => {
    const r = expenseRowSchema.safeParse(validRow({ expense_type: undefined }))
    expect(r.success).toBe(false)
  })

  it('flags invalid expense_type with "invalidExpenseType"', () => {
    const errors = fieldErrors(validRow({ expense_type: 'water-and-sewer' }))
    expect(errors?.expense_type).toEqual(['invalidExpenseType'])
  })

  it('flags non-integer amount_minor with "invalidAmount"', () => {
    const errors = fieldErrors(validRow({ amount_minor: 12.5 }))
    expect(errors?.amount_minor).toEqual(['invalidAmount'])
  })

  it('flags non-positive amount_minor with "invalidAmount"', () => {
    const errors = fieldErrors(validRow({ amount_minor: 0 }))
    expect(errors?.amount_minor).toEqual(['invalidAmount'])
  })

  it('flags empty currency with "required"', () => {
    const errors = fieldErrors(validRow({ currency: '' }))
    expect(errors?.currency).toEqual(['required'])
  })
})

// =============================================================================
// Provider-attachment exclusivity — surfaces at row level (path: [])
// =============================================================================

describe('expenseRowSchema — provider-attachment exclusivity', () => {
  it('exactly one provider attachment is valid (profile only)', () => {
    const r = expenseRowSchema.safeParse(
      validRow({ provider_profile_id: VALID_UUID }),
    )
    expect(r.success).toBe(true)
  })

  it('exactly one provider attachment is valid (draft index only)', () => {
    const r = expenseRowSchema.safeParse(
      validRow({ provider_request_draft_index: 0 }),
    )
    expect(r.success).toBe(true)
  })

  it('no attachments is valid ("unspecified" state)', () => {
    const r = expenseRowSchema.safeParse(validRow())
    expect(r.success).toBe(true)
  })

  it('provider_profile_id + provider_request_draft_index → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({
        provider_profile_id: VALID_UUID,
        provider_request_draft_index: 0,
      }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'provider_attachment_conflict',
    )
    expect(conflict).toBeDefined()
    expect(conflict?.path).toEqual([])
  })
})
