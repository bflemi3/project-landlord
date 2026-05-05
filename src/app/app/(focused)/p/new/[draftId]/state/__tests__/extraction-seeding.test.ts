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

  it('returns the tenants slice initialized to an empty array', () => {
    const data = defaultSectionData()
    expect(data.tenants).toEqual([])
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
      due_day: 10,
      start_date: undefined,
      end_date: undefined,
    })
  })

  it('seeds start_date and end_date from extraction.contractDates', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        contractDates: { start: '2026-01-15', end: '2027-01-14' },
      }),
    )

    expect((result['rent-dates'] as { start_date: string }).start_date).toBe(
      '2026-01-15',
    )
    expect((result['rent-dates'] as { end_date: string }).end_date).toBe(
      '2027-01-14',
    )
  })

  it('coerces null contractDates fields to undefined on the slice', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        contractDates: { start: null, end: null },
      }),
    )

    expect(
      (result['rent-dates'] as { start_date: unknown }).start_date,
    ).toBeUndefined()
    expect(
      (result['rent-dates'] as { end_date: unknown }).end_date,
    ).toBeUndefined()
  })

  it('keeps both date slots undefined when contractDates is null', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ contractDates: null }),
    )

    expect(
      (result['rent-dates'] as { start_date: unknown }).start_date,
    ).toBeUndefined()
    expect(
      (result['rent-dates'] as { end_date: unknown }).end_date,
    ).toBeUndefined()
  })

  it('seeds only the present side when contractDates supplies one date', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        contractDates: { start: '2026-03-01', end: null },
      }),
    )

    expect((result['rent-dates'] as { start_date: string }).start_date).toBe(
      '2026-03-01',
    )
    expect(
      (result['rent-dates'] as { end_date: unknown }).end_date,
    ).toBeUndefined()
  })

  it('keeps the default due_day when extraction returns dueDay: null', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        rent: {
          amount: 300_000,
          currency: 'BRL',
          dueDay: null,
          includes: [],
        },
      }),
    )

    expect((result['rent-dates'] as { due_day: number }).due_day).toBe(5)
  })

  it('keeps the default due_day when extraction has no rent block', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ rent: null }),
    )

    expect((result['rent-dates'] as { due_day: number }).due_day).toBe(5)
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
    // to extraction seeding for this plan. Uses the `expenses` slice as the
    // sentinel since `tenants` is now actively merged.
    const prev: SectionData = {
      property: defaultPropertyInput(),
      expenses: { foo: 'bar' } as unknown,
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
    expect(result.expenses).toEqual({ foo: 'bar' })
  })

  it('seeds tenants from extraction.tenants with isExtracted=true on each row', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({
        tenants: [
          {
            name: 'Maria Silva',
            email: 'maria@example.com',
            taxId: '040.032.329-09',
          },
          {
            name: 'João Santos',
            email: null,
            taxId: '529.982.247-25',
          },
        ],
      }),
    )
    const tenants = result.tenants as Array<{
      name: string
      email: string
      taxId: string
      inviteNow: boolean
      isExtracted: boolean
      id: string
    }>
    expect(tenants).toHaveLength(2)
    expect(tenants[0]).toMatchObject({
      name: 'Maria Silva',
      email: 'maria@example.com',
      taxId: '040.032.329-09',
      inviteNow: true,
      isExtracted: true,
    })
    expect(tenants[0]?.id.length).toBeGreaterThan(0)
    expect(tenants[1]).toMatchObject({
      name: 'João Santos',
      email: '',
      taxId: '529.982.247-25',
      inviteNow: true,
      isExtracted: true,
    })
  })

  it('coerces a null tenants block to an empty array', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ tenants: null }),
    )
    expect(result.tenants).toEqual([])
  })

  it('produces an empty tenants array when extraction.tenants is an empty list', () => {
    const result = mergeExtractionIntoSectionData(
      defaultSectionData(),
      makeExtraction({ tenants: [] }),
    )
    expect(result.tenants).toEqual([])
  })

  it('overwrites a previously-populated tenants slice with the new extraction', () => {
    // Re-extraction (commit a different ContractExtractionResult) should
    // replace the slice, matching how property/rent-dates behave. Manual
    // edits between extractions are not preserved by design.
    const prev: SectionData = {
      ...defaultSectionData(),
      tenants: [
        {
          id: 'old-1',
          name: 'Stale',
          email: 'stale@example.com',
          taxId: '',
          inviteNow: true,
          isExtracted: true,
        },
      ],
    }
    const result = mergeExtractionIntoSectionData(
      prev,
      makeExtraction({
        tenants: [
          { name: 'Fresh', email: 'fresh@example.com', taxId: null },
        ],
      }),
    )
    const tenants = result.tenants as Array<{ name: string }>
    expect(tenants).toHaveLength(1)
    expect(tenants[0]?.name).toBe('Fresh')
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
