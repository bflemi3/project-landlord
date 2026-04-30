import { describe, expect, it } from 'vitest'

import { validatePropertyCore } from '../validate-property'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

describe('validatePropertyCore', () => {
  it('validates property fields with the property schema before duplicate checks', async () => {
    const supabase = {
      from() {
        throw new Error('duplicate check should not run')
      },
    } as unknown as TypedSupabaseClient

    // Exercise runtime validation for tampered input; callers should receive
    // translation-key errors instead of leaking into DB validation.
    const result = await validatePropertyCore(supabase, {
      name: 'Valid Name',
      postal_code: '01310100',
      street: 'Rua Teste',
      number: '123',
      complement: '',
      neighborhood: '',
      city: 'Sao Paulo',
      state: 'SP',
      country_code: 'BR',
      property_type: 'condo',
    } as unknown as Parameters<typeof validatePropertyCore>[1])

    expect(result).toEqual({
      valid: false,
      errors: {
        property_type: ['invalidPropertyType'],
      },
    })
  })

  it('returns address provider errors before duplicate checks', async () => {
    const supabase = {
      from() {
        throw new Error('duplicate check should not run')
      },
    } as unknown as TypedSupabaseClient

    const result = await validatePropertyCore(supabase, {
      name: 'Valid Name',
      postal_code: '123',
      street: 'Rua Teste',
      number: '123',
      complement: '',
      neighborhood: '',
      city: 'Sao Paulo',
      state: 'SP',
      country_code: 'BR',
      property_type: null,
    })

    expect(result).toEqual({
      valid: false,
      errors: {
        postal_code: ['invalidPostalCode'],
      },
    })
  })
})
