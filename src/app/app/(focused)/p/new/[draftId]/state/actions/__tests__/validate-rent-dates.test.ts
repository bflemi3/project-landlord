import { describe, expect, it } from 'vitest'

import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { validateRentDatesCore } from '../validate-rent-dates'
import { defaultRentDatesInput } from '../../rent-dates-schema'

const supabase = {} as TypedSupabaseClient

describe('validateRentDatesCore', () => {
  it('requires rent amount on the contract path', async () => {
    const result = await validateRentDatesCore(
      supabase,
      defaultRentDatesInput(),
      'contract',
    )

    expect(result).toEqual({
      valid: false,
      errors: {
        amount_minor: ['required'],
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

  it('returns valid + fields on the contract path when amount and due_day are provided', async () => {
    const result = await validateRentDatesCore(
      supabase,
      { ...defaultRentDatesInput(), amount_minor: 250_000 },
      'contract',
    )

    expect(result).toEqual({
      valid: true,
      fields: { amount_minor: 250_000, currency: 'BRL', due_day: 5 },
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
      fields: { amount_minor: 1_000, currency: 'USD', due_day: 5 },
    })
  })

  it('requires due_day on the contract path when the user has cleared it', async () => {
    const result = await validateRentDatesCore(
      supabase,
      {
        ...defaultRentDatesInput(),
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
      { ...defaultRentDatesInput(), due_day: undefined },
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
      { ...defaultRentDatesInput(), amount_minor: 250_000, due_day: 32 },
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
