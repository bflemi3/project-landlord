import { describe, expect, it } from 'vitest'

import { defaultPropertyInput } from '@/schemas/property'

import { defaultSectionData } from '../extraction-seeding'
import { hasWizardWork } from '../derivations'
import { defaultRentDatesInput } from '../../steps/checkout/sections/rent-dates/schemas'
import { defaultTaxIdInput } from '../../steps/checkout/sections/tax-id/schemas'
import {
  defaultExpenseRow,
  type ExpenseRow,
} from '../../steps/checkout/sections/expenses/schemas'
import {
  defaultTenantRow,
  type TenantRow,
} from '../../steps/checkout/sections/tenants/schemas'
import type { SectionId } from '../registry'
import type { SectionStatus } from '../persistence'

function freshState() {
  return {
    contractFile: null,
    extractionResult: null,
    sectionData: defaultSectionData(),
    sectionStates: {
      property: 'upcoming',
      'rent-dates': 'upcoming',
      tenants: 'upcoming',
      expenses: 'upcoming',
      'tax-id': 'upcoming',
      bank: 'upcoming',
    } as Record<SectionId, SectionStatus>,
  } as const
}

describe('hasWizardWork', () => {
  it('returns false for a fresh wizard with no user input (regression: previously always true)', () => {
    expect(hasWizardWork(freshState())).toBe(false)
  })

  it('returns true when a contract file is present', () => {
    expect(
      hasWizardWork({ ...freshState(), contractFile: new File([], 'a.pdf') }),
    ).toBe(true)
  })

  it('returns true when an extraction result is present', () => {
    expect(
      hasWizardWork({
        ...freshState(),
        // Cast — the predicate only checks for non-null.
        extractionResult: {} as never,
      }),
    ).toBe(true)
  })

  it('returns true when any section status is past upcoming', () => {
    const state = freshState()
    expect(
      hasWizardWork({
        ...state,
        sectionStates: { ...state.sectionStates, property: 'completed' },
      }),
    ).toBe(true)
  })

  it('returns true when the property slice has user content', () => {
    const state = freshState()
    expect(
      hasWizardWork({
        ...state,
        sectionData: {
          ...state.sectionData,
          property: { ...defaultPropertyInput(), street: 'Rua A' },
        },
      }),
    ).toBe(true)
  })

  it('returns true when the rent-dates slice has user content', () => {
    const state = freshState()
    expect(
      hasWizardWork({
        ...state,
        sectionData: {
          ...state.sectionData,
          'rent-dates': { ...defaultRentDatesInput(), amount_minor: 100 },
        },
      }),
    ).toBe(true)
  })

  it('returns true when the tenants slice has any rows', () => {
    const state = freshState()
    const tenants: TenantRow[] = [defaultTenantRow()]
    expect(
      hasWizardWork({
        ...state,
        sectionData: { ...state.sectionData, tenants },
      }),
    ).toBe(true)
  })

  it('returns true when the expenses slice has any rows', () => {
    const state = freshState()
    const expenses: ExpenseRow[] = [defaultExpenseRow()]
    expect(
      hasWizardWork({
        ...state,
        sectionData: { ...state.sectionData, expenses },
      }),
    ).toBe(true)
  })

  it('returns true when tax-id has been entered', () => {
    const state = freshState()
    expect(
      hasWizardWork({
        ...state,
        sectionData: {
          ...state.sectionData,
          'tax-id': { ...defaultTaxIdInput(), tax_id: '123' },
        },
      }),
    ).toBe(true)
  })
})
