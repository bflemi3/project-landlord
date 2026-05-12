import { describe, expect, it } from 'vitest'

import {
  defaultRentDatesInput,
  rentDatesContractSchema,
  rentDatesNoContractSchema,
  rentDatesSchemaFor,
} from '../schemas'

describe('defaultRentDatesInput', () => {
  it('returns the canonical blank rent-dates slice with default due_day=5 and undefined dates', () => {
    expect(defaultRentDatesInput()).toEqual({
      amount_minor: undefined,
      currency: 'BRL',
      due_day: 5,
      start_date: undefined,
      end_date: undefined,
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

// rentDatesNoContractSchema — structural validation (rules that apply on both
// paths: range, integer-ness, currency enum). Tested here because the no-
// contract schema lets us hit individual fields in isolation without the
// noise of "and these other fields are also required".

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

  it('accepts start_date in ISO YYYY-MM-DD format', () => {
    const parsed = rentDatesNoContractSchema.parse({ start_date: '2026-01-01' })
    expect(parsed.start_date).toBe('2026-01-01')
  })

  it('accepts end_date in ISO YYYY-MM-DD format', () => {
    const parsed = rentDatesNoContractSchema.parse({ end_date: '2026-12-31' })
    expect(parsed.end_date).toBe('2026-12-31')
  })

  it('rejects start_date in non-ISO format with invalidDate', () => {
    const result = rentDatesNoContractSchema.safeParse({
      start_date: '01/01/2026',
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'start_date' && i.message === 'invalidDate',
      ),
    ).toBe(true)
  })

  it('rejects end_date in non-ISO format with invalidDate', () => {
    const result = rentDatesNoContractSchema.safeParse({
      end_date: '2026/12/31',
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'end_date' && i.message === 'invalidDate',
      ),
    ).toBe(true)
  })

  it('treats explicit start_date=undefined as valid (cleared)', () => {
    const result = rentDatesNoContractSchema.parse({ start_date: undefined })
    expect(result.start_date).toBeUndefined()
  })

  it('treats explicit end_date=undefined as valid (cleared)', () => {
    const result = rentDatesNoContractSchema.parse({ end_date: undefined })
    expect(result.end_date).toBeUndefined()
  })
})

// rentDatesContractSchema — required-field enforcement. The contract path
// promotes amount_minor + due_day from optional to required so the form's
// `continueDisabled={!form.isValid}` gate fires when the user hasn't filled
// them in. Structural rules still apply on top.

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
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    })
    expect(result).toEqual({
      amount_minor: 250_000,
      currency: 'BRL',
      due_day: 10,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    })
  })

  it('rejects a missing start_date with "required"', () => {
    const result = rentDatesContractSchema.safeParse({
      amount_minor: 250_000,
      due_day: 10,
      end_date: '2026-12-31',
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'start_date' && i.message === 'required',
      ),
    ).toBe(true)
  })

  it('rejects a missing end_date with "required"', () => {
    const result = rentDatesContractSchema.safeParse({
      amount_minor: 250_000,
      due_day: 10,
      start_date: '2026-01-01',
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) => i.path[0] === 'end_date' && i.message === 'required',
      ),
    ).toBe(true)
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

// Cross-field rule: end_date must be ≥ start_date when BOTH are present.
// Same superRefine on both schemas, so the suite parameterizes over them.

describe.each([
  ['rentDatesContractSchema', rentDatesContractSchema],
  ['rentDatesNoContractSchema', rentDatesNoContractSchema],
] as const)('%s — cross-field endDateBeforeStart', (_name, schema) => {
  // Contract path requires amount_minor + due_day; supply minimum valid
  // values so the only failure under test is the cross-field rule.
  const baseValid = { amount_minor: 250_000, due_day: 10 }

  it('flags end_date with "endDateBeforeStart" when end < start', () => {
    const result = schema.safeParse({
      ...baseValid,
      start_date: '2026-06-01',
      end_date: '2026-01-01',
    })
    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) =>
          i.path[0] === 'end_date' && i.message === 'endDateBeforeStart',
      ),
    ).toBe(true)
  })

  it('does not fire when end equals start', () => {
    const result = schema.safeParse({
      ...baseValid,
      start_date: '2026-06-01',
      end_date: '2026-06-01',
    })
    expect(
      result.error?.issues.some((i) => i.message === 'endDateBeforeStart'),
    ).toBeFalsy()
  })

  it('does not fire when only start_date is present', () => {
    const result = schema.safeParse({
      ...baseValid,
      start_date: '2026-06-01',
    })
    expect(
      result.error?.issues.some((i) => i.message === 'endDateBeforeStart'),
    ).toBeFalsy()
  })

  it('does not fire when only end_date is present', () => {
    const result = schema.safeParse({
      ...baseValid,
      end_date: '2026-06-01',
    })
    expect(
      result.error?.issues.some((i) => i.message === 'endDateBeforeStart'),
    ).toBeFalsy()
  })
})
