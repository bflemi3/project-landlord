import { describe, expect, it } from 'vitest'

import { defaultPropertyInput } from '@/schemas/property'

import { defaultSectionData } from '../extraction-seeding'
import { deriveSectionValidity } from '../section-validity'
import type { PropertyCreationStateShape } from '../store'
import type { SectionId } from '../registry'
import type { SectionStatus } from '../persistence'

function baseState(
  overrides: Partial<PropertyCreationStateShape> = {},
): PropertyCreationStateShape {
  const sectionStates: Record<SectionId, SectionStatus> = {
    property: 'completed',
    'rent-dates': 'completed',
    tenants: 'upcoming',
    expenses: 'upcoming',
    'tax-id': 'completed',
    bank: 'upcoming',
  }
  return {
    step: 2,
    contractFile: null,
    contractFileName: null,
    contractFileType: null,
    extractionResult: null,
    path: 'no_contract',
    sectionStates,
    activeSectionId: null,
    sectionData: {
      ...defaultSectionData(),
      property: {
        ...defaultPropertyInput(),
        postal_code: '01310-100',
        street: 'Rua Teste',
        number: '123',
        city: 'Sao Paulo',
        state: 'SP',
      },
      'tax-id': { tax_id: '11144477735' },
    },
    sectionTouched: {},
    visitedSectionIds: new Set<SectionId>(['property', 'rent-dates', 'tax-id']),
    tenantsListUI: { activeTenantId: null },
    expensesListUI: { activeExpenseId: null },
    sectionServerErrors: {
      property: {},
      'rent-dates': {},
      tenants: {},
      expenses: {},
      'tax-id': {},
      bank: {},
    },
    globalErrors: [],
    ...overrides,
  }
}

describe('deriveSectionValidity — server errors', () => {
  it('returns "invalid" when a flat section has any server error', () => {
    const state = baseState({
      sectionServerErrors: {
        property: { street: ['required'] },
        'rent-dates': {},
        tenants: {},
        expenses: {},
        'tax-id': {},
        bank: {},
      },
    })
    expect(deriveSectionValidity('property', state)).toBe('invalid')
  })

  it('returns "invalid" when a row section has at least one row with errors', () => {
    const state = baseState({
      sectionServerErrors: {
        property: {},
        'rent-dates': {},
        tenants: {},
        expenses: { 'row-1': { amount_minor: ['required'] } },
        'tax-id': {},
        bank: {},
      },
    })
    expect(deriveSectionValidity('expenses', state)).toBe('invalid')
  })

  it('does not return "invalid" when the section slice is empty', () => {
    const state = baseState()
    expect(deriveSectionValidity('property', state)).toBe('completed')
  })

  it('treats a row section with an empty per-row slice as no error', () => {
    // Defensive: an empty `{}` per-row value means the row has no field
    // errors. The section as a whole should not flip to "invalid" off it.
    const state = baseState({
      sectionServerErrors: {
        property: {},
        'rent-dates': {},
        tenants: {},
        expenses: { 'row-1': {} },
        'tax-id': {},
        bank: {},
      },
    })
    expect(deriveSectionValidity('expenses', state)).not.toBe('invalid')
  })

  it('keeps schema-driven invalid for engaged sections without server errors', () => {
    const state = baseState({
      sectionData: {
        ...defaultSectionData(),
        // Empty property triggers schema invalid.
        property: defaultPropertyInput(),
      },
    })
    expect(deriveSectionValidity('property', state)).toBe('invalid')
  })
})
