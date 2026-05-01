import { describe, expect, it } from 'vitest'

import {
  defaultRentDatesInput,
  rentDatesContractSchema,
  rentDatesNoContractSchema,
  rentDatesSchemaFor,
} from '../rent-dates-schema'

describe('defaultRentDatesInput', () => {
  it('returns the canonical blank rent-dates slice with default due_day=5', () => {
    expect(defaultRentDatesInput()).toEqual({
      amount_minor: undefined,
      currency: 'BRL',
      due_day: 5,
    })
  })
})

describe('rentDatesSchemaFor', () => {
  it('returns the contract schema for path="contract"', () => {
    expect(rentDatesSchemaFor('contract')).toBe(rentDatesContractSchema)
  })

  it('returns the no-contract schema for path="no_contract"', () => {
    expect(rentDatesSchemaFor('no_contract')).toBe(rentDatesNoContractSchema)
  })

  it('returns the contract schema (stricter default) when path is null', () => {
    // The section shouldn't render before path commit; defaulting to the
    // stricter schema keeps a stray validation safer than the looser one.
    expect(rentDatesSchemaFor(null)).toBe(rentDatesContractSchema)
  })
})

// ---------------------------------------------------------------------------
// rentDatesNoContractSchema — structural validation (rules that apply on both
// paths: range, integer-ness, currency enum). Tested here because the no-
// contract schema lets us hit individual fields in isolation without the
// noise of "and these other fields are also required".
// ---------------------------------------------------------------------------

describe('rentDatesNoContractSchema — structural validation', () => {
  it('accepts a blank slice and fills defaults', () => {
    expect(rentDatesNoContractSchema.parse({})).toEqual(defaultRentDatesInput())
  })

  it('rejects amount_minor=0 (must be positive)', () => {
    const result = rentDatesNoContractSchema.safeParse({ amount_minor: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidAmount')
  })

  it('caps amount_minor at the shared currency maximum', () => {
    const result = rentDatesNoContractSchema.safeParse({
      amount_minor: 100_000_000_00,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('tooLarge')
  })

  it('rejects non-integer amount_minor', () => {
    const result = rentDatesNoContractSchema.safeParse({ amount_minor: 1.5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidAmount')
  })

  it('rejects unsupported currency codes', () => {
    const result = rentDatesNoContractSchema.safeParse({ currency: 'EUR' })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((i) => i.message === 'invalidCurrency'),
    ).toBe(true)
  })

  it('accepts due_day at the lower boundary (1)', () => {
    const parsed = rentDatesNoContractSchema.parse({ due_day: 1 })
    expect(parsed.due_day).toBe(1)
  })

  it('accepts due_day at the upper boundary (31)', () => {
    const parsed = rentDatesNoContractSchema.parse({ due_day: 31 })
    expect(parsed.due_day).toBe(31)
  })

  it('rejects due_day below 1', () => {
    const result = rentDatesNoContractSchema.safeParse({ due_day: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidDueDay')
  })

  it('rejects due_day above 31', () => {
    const result = rentDatesNoContractSchema.safeParse({ due_day: 32 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidDueDay')
  })

  it('rejects non-integer due_day', () => {
    const result = rentDatesNoContractSchema.safeParse({ due_day: 5.5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidDueDay')
  })

  it('keeps the default due_day when input omits it', () => {
    const result = rentDatesNoContractSchema.parse({})
    expect(result.due_day).toBe(5)
  })

  it('treats explicit due_day=undefined as cleared (not the default)', () => {
    const result = rentDatesNoContractSchema.parse({ due_day: undefined })
    expect(result.due_day).toBeUndefined()
  })

  it('treats explicit amount_minor=undefined as valid (cleared)', () => {
    const result = rentDatesNoContractSchema.parse({ amount_minor: undefined })
    expect(result.amount_minor).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// rentDatesContractSchema — required-field enforcement. The contract path
// promotes amount_minor + due_day from optional to required so the form's
// `continueDisabled={!form.isValid}` gate fires when the user hasn't filled
// them in. Structural rules still apply on top.
// ---------------------------------------------------------------------------

describe('rentDatesContractSchema — required-field enforcement', () => {
  it('rejects a missing amount_minor with "required"', () => {
    const result = rentDatesContractSchema.safeParse({ due_day: 5 })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'amount_minor' && i.message === 'required',
      ),
    ).toBe(true)
  })

  it('rejects an explicit amount_minor=undefined with "required"', () => {
    const result = rentDatesContractSchema.safeParse({
      amount_minor: undefined,
      due_day: 5,
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'amount_minor' && i.message === 'required',
      ),
    ).toBe(true)
  })

  it('rejects a missing due_day with "required"', () => {
    const result = rentDatesContractSchema.safeParse({ amount_minor: 250_000 })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'due_day' && i.message === 'required',
      ),
    ).toBe(true)
  })

  it('surfaces both required errors when both fields are missing', () => {
    const result = rentDatesContractSchema.safeParse({})
    expect(result.success).toBe(false)
    const messages =
      result.error?.issues.map((i) => `${String(i.path[0])}:${i.message}`) ?? []
    expect(messages).toContain('amount_minor:required')
    expect(messages).toContain('due_day:required')
  })

  it('returns the parsed fields on the happy path', () => {
    const result = rentDatesContractSchema.parse({
      amount_minor: 250_000,
      due_day: 10,
    })
    expect(result).toEqual({
      amount_minor: 250_000,
      currency: 'BRL',
      due_day: 10,
    })
  })

  it('still applies structural validation when required fields are present', () => {
    // amount_minor is structurally invalid (0). Schema should surface
    // 'invalidAmount', not 'required'.
    const result = rentDatesContractSchema.safeParse({
      amount_minor: 0,
      due_day: 5,
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'amount_minor' && i.message === 'invalidAmount',
      ),
    ).toBe(true)
  })
})
