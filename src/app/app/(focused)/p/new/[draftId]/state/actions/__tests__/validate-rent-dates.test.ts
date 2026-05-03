import { describe, expect, it } from 'vitest'

import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { validateRentDatesCore } from '../validate-rent-dates'
import { defaultRentDatesInput } from '../../rent-dates-schema'

const supabase = {} as TypedSupabaseClient

// Minimum slice that satisfies start_date + end_date on the contract path.
// Tests that target a single OTHER required field layer this in so the
// schema's date requirements don't leak unrelated `required` issues into
// their assertions.
const VALID_DATES = {
  start_date: '2026-01-01',
  end_date: '2026-12-31',
} as const

describe('validateRentDatesCore', () => {
  it('requires rent amount, start_date, and end_date on the contract path', async () => {
    const result = await validateRentDatesCore(
      supabase,
      defaultRentDatesInput(),
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: {
        amount_minor: ['required'],
        start_date: ['required'],
        end_date: ['required'],
      },
    })
  })

  it('allows a blank rent-dates slice on the no-contract path', async () => {
    const result = await validateRentDatesCore(
      supabase,
      defaultRentDatesInput(),
      'no_contract',
    )

    expect(result).toEqual({
      valid: true,
      fields: defaultRentDatesInput(),
    })
  })

  it('surfaces structural schema errors (tooLarge takes precedence over required)', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        ...VALID_DATES,
        amount_minor: 100_000_000_00,
      },
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: {
        amount_minor: ['tooLarge'],
      },
    })
  })

  it('returns valid + fields on the contract path when every required field is set', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        amount_minor: 250_000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      },
      'contract',
    )

    expect(result).toEqual({
      valid: true,
      fields: {
        amount_minor: 250_000,
        currency: 'BRL',
        due_day: 5,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      },
    })
  })

  it('returns valid + fields on the no-contract path when amount is provided', async () => {
    const result = await validateRentDatesCore(
      supabase,
      { ...defaultRentDatesInput(), amount_minor: 1_000, currency: 'USD' },
      'no_contract',
    )

    expect(result).toEqual({
      valid: true,
      fields: {
        amount_minor: 1_000,
        currency: 'USD',
        due_day: 5,
        start_date: undefined,
        end_date: undefined,
      },
    })
  })

  it('surfaces endDateBeforeStart on the contract path when end < start', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        amount_minor: 250_000,
        start_date: '2026-06-01',
        end_date: '2026-01-01',
      },
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: { end_date: ['endDateBeforeStart'] },
    })
  })

  it('surfaces endDateBeforeStart on the no-contract path when end < start', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        start_date: '2026-06-01',
        end_date: '2026-01-01',
      },
      'no_contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: { end_date: ['endDateBeforeStart'] },
    })
  })

  it('surfaces invalidDate from the schema regex up through the action', async () => {
    // Locks in the error-pipeline contract: schema regex code → field-error
    // shape produced by zodIssuesToFieldErrors → translated by the form via
    // tRentDates(error). Regression guard against any of those layers
    // dropping or renaming the code in transit. The field is bypassing the
    // RentDatesInput type to feed the schema a malformed string — the picker
    // can't produce this state, but extraction-seeded persisted data could.
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        start_date: '01/01/2026' as unknown as string,
        end_date: '2026-12-31',
      },
      'no_contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: { start_date: ['invalidDate'] },
    })
  })

  it('requires due_day on the contract path when the user has cleared it', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        ...VALID_DATES,
        amount_minor: 250_000,
        due_day: undefined,
      },
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: { due_day: ['required'] },
    })
  })

  it('surfaces both amount_minor and due_day required errors when both are missing', async () => {
    const result = await validateRentDatesCore(
      supabase,
      { ...defaultRentDatesInput(), ...VALID_DATES, due_day: undefined },
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: {
        amount_minor: ['required'],
        due_day: ['required'],
      },
    })
  })

  it('surfaces invalidDueDay when due_day is out of range on the contract path', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
        ...VALID_DATES,
        amount_minor: 250_000,
        due_day: 32,
      },
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: { due_day: ['invalidDueDay'] },
    })
  })

  it('allows a cleared due_day on the no-contract path', async () => {
    const result = await validateRentDatesCore(
      supabase,
      { ...defaultRentDatesInput(), due_day: undefined },
      'no_contract',
    )

    expect(result.valid).toBe(true)
  })
})
