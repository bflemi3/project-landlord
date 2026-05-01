import { describe, it, expect } from 'vitest'

import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

import {
  defaultPropertyInput,
  defaultRentDatesInput,
  defaultSectionData,
  mergeExtractionIntoSectionData,
  type SectionData,
} from '../extraction-seeding'

// Builds a ContractExtractionResult with sensible defaults so each test only
// needs to override the fields it cares about.
function makeExtraction(
  overrides: Partial<ContractExtractionResult> = {},
): ContractExtractionResult {
  return {
    isRentalContract: true,
    propertyType: null,
    address: null,
    rent: null,
    contractDates: null,
    rentAdjustment: null,
    landlords: null,
    tenants: null,
    expenses: null,
    languageDetected: 'pt-br',
    rawExtractedText: '',
    ...overrides,
  }
}

describe('defaultSectionData', () => {
  it('returns the property slice initialized to defaultPropertyInput()', () => {
    const data = defaultSectionData()
    expect(data.property).toEqual(defaultPropertyInput())
  })

  it('returns the rent-dates slice initialized to defaultRentDatesInput()', () => {
    const data = defaultSectionData()
    expect(data['rent-dates']).toEqual(defaultRentDatesInput())
  })
})

describe('mergeExtractionIntoSectionData', () => {
  it('populates every property address field when the full address is present', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        propertyType: 'apartment',
        address: {
          street: 'Rua Augusta',
          number: '123',
          complement: 'Apto 4B',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          postalCode: '01310-100',
          country: 'BR',
        },
      }),
    )

    expect(result.property).toEqual({
      name: '',
      postal_code: '01310-100',
      street: 'Rua Augusta',
      number: '123',
      complement: 'Apto 4B',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      country_code: 'BR',
      property_type: 'apartment',
    })
  })

  it('maps camelCase postalCode onto snake_case postal_code', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        address: {
          street: null,
          number: null,
          complement: null,
          neighborhood: null,
          city: null,
          state: null,
          postalCode: '04567-000',
          country: null,
        },
      }),
    )

    expect((result.property as { postal_code: string }).postal_code).toBe(
      '04567-000',
    )
  })

  it('coerces partial-null address fields to empty strings', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        address: {
          street: 'Av. Paulista',
          number: null,
          complement: null,
          neighborhood: null,
          city: 'São Paulo',
          state: null,
          postalCode: null,
          country: null,
        },
      }),
    )

    const property = result.property as Record<string, unknown>
    expect(property.street).toBe('Av. Paulista')
    expect(property.number).toBe('')
    expect(property.complement).toBe('')
    expect(property.neighborhood).toBe('')
    expect(property.city).toBe('São Paulo')
    expect(property.state).toBe('')
    expect(property.postal_code).toBe('')
  })

  it('coerces a null address object to all-empty fields, BR country, and empty name', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ address: null }),
    )

    expect(result.property).toEqual({
      name: '',
      postal_code: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      country_code: 'BR',
      property_type: null,
    })
  })

  it('passes propertyType: null through unchanged', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ propertyType: null }),
    )
    expect((result.property as { property_type: unknown }).property_type).toBeNull()
  })

  it('passes propertyType: "apartment" through unchanged', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ propertyType: 'apartment' }),
    )
    expect((result.property as { property_type: unknown }).property_type).toBe(
      'apartment',
    )
  })

  it('seeds rent-dates fields needed by the currency input from rent extraction', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        rent: {
          amount: 450_000,
          currency: 'USD',
          dueDay: 10,
          includes: ['rent', 'condo'],
        },
      }),
    )

    expect(result['rent-dates']).toEqual({
      amount_minor: 450_000,
      currency: 'USD',
    })
  })

  it('falls back to BRL when extracted rent currency is unsupported', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        rent: {
          amount: 300_000,
          currency: 'EUR',
          dueDay: null,
          includes: [],
        },
      }),
    )

    expect((result['rent-dates'] as { currency: string }).currency).toBe('BRL')
  })

  it('always seeds property.name as an empty string regardless of extraction shape', () => {
    const fromFull = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        propertyType: 'house',
        address: {
          street: 'Rua A',
          number: '1',
          complement: null,
          neighborhood: null,
          city: 'Rio',
          state: 'RJ',
          postalCode: '20000-000',
          country: 'BR',
        },
      }),
    )
    const fromEmpty = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction(),
    )

    expect((fromFull.property as { name: string }).name).toBe('')
    expect((fromEmpty.property as { name: string }).name).toBe('')
  })

  it('preserves other section keys in prev unchanged', () => {
    // Ensures the merge function doesn't overwrite slices that are unrelated
    // to extraction seeding for this plan.
    const prev: SectionData = {
      property: defaultPropertyInput(),
      tenants: { foo: 'bar' } as unknown,
    }
    const result = mergeExtractionIntoSectionData(
      prev,
      makeExtraction({
        address: {
          street: 'Rua A',
          number: '1',
          complement: null,
          neighborhood: null,
          city: 'Rio',
          state: 'RJ',
          postalCode: '20000-000',
          country: 'BR',
        },
      }),
    )
    expect(result.tenants).toEqual({ foo: 'bar' })
  })

  it('re-exports defaultPropertyInput() with the canonical blank shape', () => {
    // Ensures the default shape stays in lock-step with the seeded shape's
    // fields and types — the store's `defaultState()` initializes every
    // section's slice to its blank shape via this function.
    expect(defaultPropertyInput()).toEqual({
      name: '',
      postal_code: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      country_code: 'BR',
      property_type: null,
    })
  })
})
