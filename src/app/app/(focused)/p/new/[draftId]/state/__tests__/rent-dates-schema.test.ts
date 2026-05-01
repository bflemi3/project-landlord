import { describe, expect, it } from 'vitest'

import {
  defaultRentDatesInput,
  rentDatesSchema,
} from '../rent-dates-schema'

describe('defaultRentDatesInput', () => {
  it('returns the canonical blank rent-dates slice', () => {
    expect(defaultRentDatesInput()).toEqual({
      amount_minor: undefined,
      currency: 'BRL',
    })
  })
})

describe('rentDatesSchema', () => {
  it('accepts a blank optional slice and fills defaults', () => {
    expect(rentDatesSchema.parse({})).toEqual(defaultRentDatesInput())
  })

  it('validates positive integer minor-unit rent amounts', () => {
    const result = rentDatesSchema.safeParse({
      amount_minor: 0,
      currency: 'BRL',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidAmount')
  })

  it('caps amount_minor at the shared currency maximum', () => {
    const result = rentDatesSchema.safeParse({
      amount_minor: 100_000_000_00,
      currency: 'BRL',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('tooLarge')
  })

  it('rejects non-integer minor-unit amounts', () => {
    // Money is stored as integer minor units. A float like 1.5 cents shouldn't
    // pass — the .int() chain after .number() is the guard, and this test
    // locks it in.
    const result = rentDatesSchema.safeParse({
      amount_minor: 1.5,
      currency: 'BRL',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('invalidAmount')
  })

  it('rejects unsupported currency codes', () => {
    const result = rentDatesSchema.safeParse({
      currency: 'EUR',
    })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((i) => i.message === 'invalidCurrency'),
    ).toBe(true)
  })
})
