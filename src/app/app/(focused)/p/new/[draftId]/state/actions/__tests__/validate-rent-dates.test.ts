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

  it('returns schema errors before section-level required checks', async () => {
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

  it('returns valid + fields on the contract path when amount is provided', async () => {
    const result = await validateRentDatesCore(
      supabase,
      { ...defaultRentDatesInput(), amount_minor: 250_000 },
      'contract',
    )

    expect(result).toEqual({
      valid: true,
      fields: { amount_minor: 250_000, currency: 'BRL' },
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
      fields: { amount_minor: 1_000, currency: 'USD' },
    })
  })
})
