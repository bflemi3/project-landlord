import { describe, expect, it } from 'vitest'

import { defaultRentDatesInput, type RentDatesInput } from '../schemas'
import { isDefault, setAllTouched } from '../state'

describe('rent-dates/state — setAllTouched', () => {
  it('returns a Set with every rent-dates field when called with an empty Set', () => {
    const next = setAllTouched(new Set())
    expect(next.has('amount_minor')).toBe(true)
    expect(next.has('currency')).toBe(true)
    expect(next.has('due_day')).toBe(true)
    expect(next.has('start_date')).toBe(true)
    expect(next.has('end_date')).toBe(true)
  })

  it('short-circuits when prev already contains every field (returns the same ref)', () => {
    const full = setAllTouched(new Set())
    expect(setAllTouched(full)).toBe(full)
  })

  it('returns a fresh Set when prev is missing at least one field', () => {
    const partial: ReadonlySet<string> = new Set(['amount_minor'])
    expect(setAllTouched(partial)).not.toBe(partial)
  })
})

describe('rent-dates/state — isDefault', () => {
  it('returns true for undefined slice', () => {
    expect(isDefault(undefined)).toBe(true)
  })

  it('returns true for the seeded default', () => {
    expect(isDefault(defaultRentDatesInput())).toBe(true)
  })

  it('returns false when amount_minor is set', () => {
    const slice: RentDatesInput = {
      ...defaultRentDatesInput(),
      amount_minor: 100,
    }
    expect(isDefault(slice)).toBe(false)
  })

  it('returns false when start_date is set', () => {
    const slice: RentDatesInput = {
      ...defaultRentDatesInput(),
      start_date: '2026-01-01',
    }
    expect(isDefault(slice)).toBe(false)
  })

  it('returns true when due_day equals the default DEFAULT_DUE_DAY', () => {
    // Sanity: the seeded default has due_day === 5; a slice with that same
    // value is still default.
    expect(isDefault(defaultRentDatesInput())).toBe(true)
  })
})
