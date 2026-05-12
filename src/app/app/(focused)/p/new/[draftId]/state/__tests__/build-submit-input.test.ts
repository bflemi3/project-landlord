import { describe, expect, it } from 'vitest'

import { defaultPropertyInput } from '@/schemas/property'

import { buildSubmitInputFromStore } from '../build-submit-input'
import { defaultSectionData } from '../extraction-seeding'
import { defaultRentDatesInput } from '../../steps/checkout/sections/rent-dates/schemas'
import { defaultTaxIdInput } from '../../steps/checkout/sections/tax-id/schemas'
import type { PropertyCreationStateShape } from '../store'
import type { SectionId } from '../registry'
import type { SectionStatus } from '../persistence'
import type { TenantRow } from '../../steps/checkout/sections/tenants/schemas'
import type { ExpenseRow } from '../../steps/checkout/sections/expenses/schemas'

function baseState(
  overrides: Partial<PropertyCreationStateShape> = {},
): PropertyCreationStateShape {
  const sectionStates: Record<SectionId, SectionStatus> = {
    property: 'completed',
    'rent-dates': 'completed',
    tenants: 'completed',
    expenses: 'completed',
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
    sectionData: defaultSectionData(),
    sectionTouched: {},
    visitedSectionIds: new Set(),
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

const DRAFT_ID = '00000000-0000-0000-0000-000000000001'

describe('buildSubmitInputFromStore', () => {
  it('always sends property and tax_id, omits skipped optional sections', () => {
    const state = baseState({
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
        'rent-dates': defaultRentDatesInput(),
        'tax-id': { tax_id: '11144477735' },
        tenants: [],
        expenses: [],
      },
      sectionStates: {
        property: 'completed',
        'rent-dates': 'skipped',
        tenants: 'skipped',
        expenses: 'skipped',
        'tax-id': 'completed',
        bank: 'upcoming',
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)

    expect(input.draftId).toBe(DRAFT_ID)
    expect(input.path).toBe('no_contract')
    expect(input.property.street).toBe('Rua Teste')
    expect(input.tax_id.tax_id).toBe('11144477735')
    expect(input.rent).toBeUndefined()
    expect(input.tenants).toBeUndefined()
    expect(input.expenses).toBeUndefined()
    expect(input.contract).toBeUndefined()
    expect(input.contractFile).toBeUndefined()
  })

  it('omits rent when due_day or amount_minor are missing (optional no_contract path)', () => {
    const state = baseState({
      sectionData: {
        ...defaultSectionData(),
        property: defaultPropertyInput(),
        'rent-dates': {
          ...defaultRentDatesInput(),
          amount_minor: undefined,
          due_day: undefined,
        },
        'tax-id': defaultTaxIdInput(),
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)
    expect(input.rent).toBeUndefined()
  })

  it('renames due_day → due_day_of_month and sends rent when complete', () => {
    const state = baseState({
      sectionData: {
        ...defaultSectionData(),
        property: defaultPropertyInput(),
        'rent-dates': {
          amount_minor: 350_000,
          currency: 'BRL',
          due_day: 10,
          start_date: '2026-01-01',
          end_date: undefined,
        },
        'tax-id': { tax_id: '11144477735' },
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)
    expect(input.rent).toBeDefined()
    expect(input.rent!.amount_minor).toBe(350_000)
    expect(input.rent!.currency).toBe('BRL')
    expect(input.rent!.due_day_of_month).toBe(10)
    expect(input.rent!.start_date).toBe('2026-01-01')
    expect(input.rent!.end_date).toBeNull()
  })

  it('builds the contract payload from the contractFile + extractionResult on the contract path', () => {
    const file = new File(['%PDF-1.4 dummy'], 'lease.pdf', {
      type: 'application/pdf',
    })
    const state = baseState({
      path: 'contract',
      contractFile: file,
      contractFileName: 'lease.pdf',
      contractFileType: 'pdf',
      extractionResult: {
        isRentalContract: true,
        propertyType: 'apartment',
        address: null,
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: 'extracted text',
        modelId: 'claude-sonnet-4-6',
        schemaVersion: 1,
      },
      sectionData: {
        ...defaultSectionData(),
        property: defaultPropertyInput(),
        'rent-dates': {
          amount_minor: 250_000,
          currency: 'BRL',
          due_day: 5,
          start_date: undefined,
          end_date: undefined,
        },
        'tax-id': { tax_id: '11144477735' },
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)
    expect(input.path).toBe('contract')
    expect(input.contract).toBeDefined()
    expect(input.contract!.mime_type).toBe('application/pdf')
    expect(input.contract!.extension).toBe('pdf')
    expect(input.contract!.original_filename).toBe('lease.pdf')
    expect(input.contract!.bytes).toBe(file.size)
    expect(input.contractFile).toBe(file)
    // Wizard's camelCase `ContractExtractionResult` is unpacked into the
    // canonical flat `extraction_*` shape the action's schema expects.
    expect(input.contract!.extraction).toMatchObject({
      extraction_language: 'pt-br',
      extraction_model: 'claude-sonnet-4-6',
      extraction_schema_version: 1,
    })
  })

  it('synthesizes expense name/currency and forwards row ids', () => {
    const expenseRow: ExpenseRow = {
      id: 'row-a',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: 12_345,
      isExtracted: false,
    }
    const state = baseState({
      sectionData: {
        ...defaultSectionData(),
        property: defaultPropertyInput(),
        'rent-dates': {
          ...defaultRentDatesInput(),
          amount_minor: 100_000,
          currency: 'BRL',
          due_day: 5,
        },
        'tax-id': { tax_id: '11144477735' },
        expenses: [expenseRow],
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)
    expect(input.expenses).toBeDefined()
    expect(input.expenses).toHaveLength(1)
    expect(input.expenses![0]).toMatchObject({
      id: 'row-a',
      name: 'electricity',
      expense_type: 'electricity',
      amount_behavior: 'variable',
      amount_minor: 12_345,
      currency: 'BRL',
      provider_profile_id: null,
      provider_request_draft_index: null,
    })
  })

  it('forwards tenant rows preserving wizard-only id and inviteNow', () => {
    const tenantRow: TenantRow = {
      id: 'tenant-1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      taxId: '11144477735',
      inviteNow: true,
      isExtracted: false,
    }
    const state = baseState({
      sectionData: {
        ...defaultSectionData(),
        property: defaultPropertyInput(),
        'tax-id': { tax_id: '11144477735' },
        tenants: [tenantRow],
      },
    })

    const input = buildSubmitInputFromStore(state, DRAFT_ID)
    expect(input.tenants).toBeDefined()
    expect(input.tenants).toHaveLength(1)
    expect(input.tenants![0]).toMatchObject({
      id: 'tenant-1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      taxId: '11144477735',
      inviteNow: true,
    })
  })
})
