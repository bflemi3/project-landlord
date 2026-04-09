import { describe, it, expect } from 'vitest'
import { fetchProperty, propertyQueryKey } from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

function mockSupabase(overrides: { data?: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            single: () => Promise.resolve({
              data: overrides.data ?? null,
              error: overrides.error ?? null,
            }),
          }),
        }),
      }),
    }),
  } as unknown as TypedSupabaseClient
}

describe('fetchProperty', () => {
  it('maps row to Property shape', async () => {
    const row = {
      id: 'p1',
      name: 'Casa Verde',
      street: 'Rua A',
      number: '100',
      complement: 'Apt 1',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '01001-000',
      country_code: 'BR',
      units: [{ id: 'u1' }, { id: 'u2' }],
    }
    const result = await fetchProperty(mockSupabase({ data: row }), 'p1')
    expect(result).toEqual({
      id: 'p1',
      name: 'Casa Verde',
      street: 'Rua A',
      number: '100',
      complement: 'Apt 1',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01001-000',
      countryCode: 'BR',
      unitIds: ['u1', 'u2'],
    })
  })

  it('throws on error', async () => {
    await expect(fetchProperty(mockSupabase({ error: { message: 'fail' } }), 'p1'))
      .rejects.toThrow('Property not found')
  })

  it('throws when data is null', async () => {
    await expect(fetchProperty(mockSupabase({ data: null }), 'p1'))
      .rejects.toThrow('Property not found')
  })
})

describe('propertyQueryKey', () => {
  it('returns stable key with property id', () => {
    expect(propertyQueryKey('p1')).toEqual(['property', 'p1'])
  })
})
