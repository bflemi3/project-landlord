import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import {
  EXPENSE_AMOUNT_BEHAVIORS,
  EXPENSE_TYPES,
  expenseAmountBehaviorSchema,
  expenseRowSchema,
  expenseTypeSchema,
  findExpenseBundleCycles,
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

  it('applies defaults for provider/bundle fields when omitted', () => {
    const r = expenseRowSchema.parse({
      name: 'Electricity',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: 100,
      currency: 'BRL',
    })
    expect(r.provider_profile_id).toBeNull()
    expect(r.provider_request_draft_index).toBeNull()
    expect(r.bundled_into_rent).toBe(false)
    expect(r.bundled_into_expense_index).toBeNull()
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
// expenseRowSchema — multi-attachment conflict → ROW-LEVEL error (path: [])
// =============================================================================

describe('expenseRowSchema — multi-attachment conflicts surface at row level', () => {
  it('bundled_into_rent + provider_profile_id → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({
        bundled_into_rent: true,
        provider_profile_id: 'a1b2c3d4-1234-4567-89ab-cdef01234567',
      }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'expense_bundle_invalid_reference',
    )
    expect(conflict).toBeDefined()
    expect(conflict?.path).toEqual([])
  })

  it('bundled_into_rent + provider_request_draft_index → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({ bundled_into_rent: true, provider_request_draft_index: 0 }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'expense_bundle_invalid_reference',
    )
    expect(conflict?.path).toEqual([])
  })

  it('bundled_into_rent + bundled_into_expense_index → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({ bundled_into_rent: true, bundled_into_expense_index: 1 }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'expense_bundle_invalid_reference',
    )
    expect(conflict?.path).toEqual([])
  })

  it('provider_profile_id + provider_request_draft_index → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({
        provider_profile_id: 'a1b2c3d4-1234-4567-89ab-cdef01234567',
        provider_request_draft_index: 0,
      }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'expense_bundle_invalid_reference',
    )
    expect(conflict?.path).toEqual([])
  })

  it('bundled_into_expense_index + provider_profile_id → row-level error', () => {
    const r = expenseRowSchema.safeParse(
      validRow({
        bundled_into_expense_index: 1,
        provider_profile_id: 'a1b2c3d4-1234-4567-89ab-cdef01234567',
      }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    const conflict = r.error.issues.find(
      (i) => i.message === 'expense_bundle_invalid_reference',
    )
    expect(conflict?.path).toEqual([])
  })

  it('exactly one attachment is valid (provider_profile_id only)', () => {
    const r = expenseRowSchema.safeParse(
      validRow({ provider_profile_id: 'a1b2c3d4-1234-4567-89ab-cdef01234567' }),
    )
    expect(r.success).toBe(true)
  })

  it('exactly one attachment is valid (bundled_into_rent only)', () => {
    const r = expenseRowSchema.safeParse(validRow({ bundled_into_rent: true }))
    expect(r.success).toBe(true)
  })

  it('no attachments is valid ("unspecified" state)', () => {
    const r = expenseRowSchema.safeParse(validRow())
    expect(r.success).toBe(true)
  })
})

// =============================================================================
// findExpenseBundleCycles — pure helper
// =============================================================================

function rows(...edges: (number | null)[]) {
  return edges.map((bundled_into_expense_index) => ({
    bundled_into_expense_index,
  }))
}

describe('findExpenseBundleCycles', () => {
  it('returns an empty set when there are no bundle edges', () => {
    expect(findExpenseBundleCycles(rows(null, null, null))).toEqual(new Set())
  })

  it('returns an empty set for a simple chain (0→1→2→null)', () => {
    expect(findExpenseBundleCycles(rows(1, 2, null))).toEqual(new Set())
  })

  it('detects a 2-cycle (0→1, 1→0)', () => {
    expect(findExpenseBundleCycles(rows(1, 0))).toEqual(new Set([0, 1]))
  })

  it('detects a 3-cycle (0→1→2→0)', () => {
    expect(findExpenseBundleCycles(rows(1, 2, 0))).toEqual(new Set([0, 1, 2]))
  })

  it('ignores a self-edge (i === bundled_into_expense_index) — caught by range check upstream', () => {
    // Self-edges are filtered out as not-valid edges in the walk; the
    // submission schema's range check is what flags them with a real path.
    expect(findExpenseBundleCycles(rows(0))).toEqual(new Set())
  })

  it('ignores an out-of-range edge — caught by range check upstream', () => {
    expect(findExpenseBundleCycles(rows(99, null))).toEqual(new Set())
  })

  it('isolates a cycle in one component, leaves an acyclic component clean', () => {
    // Rows 0↔1 form a cycle; rows 2,3 are an acyclic chain (3→2→null).
    const cycles = findExpenseBundleCycles(rows(1, 0, null, 2))
    expect(cycles).toEqual(new Set([0, 1]))
  })

  it('reports every node on the DFS path when a back edge is detected', () => {
    // Graph: 0 → 1 → 2 → 1. The strict cycle is {1, 2}; node 0 merely leads
    // INTO the cycle. The helper's documented behavior is to return every
    // node currently on the DFS path at the moment of detection — a
    // superset of the strict SCC. See `findExpenseBundleCycles` JSDoc.
    const cycles = findExpenseBundleCycles(rows(1, 2, 1))
    expect(cycles).toEqual(new Set([0, 1, 2]))
  })

  it('handles an empty input', () => {
    expect(findExpenseBundleCycles([])).toEqual(new Set())
  })
})
