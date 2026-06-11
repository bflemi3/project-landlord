import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { CONTRACT_EXTRACTION_SCHEMA_VERSION } from '@/lib/contract-extraction/types'

import { propertyCreationSubmissionSchema } from '../property-creation-submission'

const PDF = 'application/pdf'
const VALID_UUID = 'a1b2c3d4-1234-4567-89ab-cdef01234567'

function validProperty(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Casa Floripa',
    country_code: 'BR',
    property_type: 'apartment',
    postal_code: '01310-100',
    street: 'Rua Augusta',
    number: '123',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    ...overrides,
  }
}

function validRent(overrides: Record<string, unknown> = {}) {
  return {
    amount_minor: 250_000,
    currency: 'BRL',
    due_day_of_month: 5,
    ...overrides,
  }
}

function validContract(overrides: Record<string, unknown> = {}) {
  return {
    mime_type: PDF,
    bytes: 1_000_000,
    original_filename: 'lease.pdf',
    extension: 'pdf',
    extraction: {
      extraction_data: {},
      extraction_language: 'pt-br',
      extraction_model: 'claude-sonnet-4-6',
      extraction_schema_version: CONTRACT_EXTRACTION_SCHEMA_VERSION,
      raw_text: '...',
      extracted_at: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  }
}

function validExpense(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Electricity',
    expense_type: 'electricity',
    amount_behavior: 'variable',
    amount_minor: 12_345,
    currency: 'BRL',
    ...overrides,
  }
}

function validTaxId(overrides: Record<string, unknown> = {}) {
  return { tax_id: '040.032.329-09', ...overrides }
}

function validNoContractPayload(overrides: Record<string, unknown> = {}) {
  return {
    path: 'no_contract' as const,
    property: validProperty(),
    tax_id: validTaxId(),
    ...overrides,
  }
}

function validContractPayload(overrides: Record<string, unknown> = {}) {
  return {
    path: 'contract' as const,
    property: validProperty(),
    rent: validRent(),
    contract: validContract(),
    tax_id: validTaxId(),
    ...overrides,
  }
}

function pathMessages(
  r: ReturnType<typeof propertyCreationSubmissionSchema.safeParse>,
  path: (string | number)[],
): string[] {
  if (r.success) return []
  return r.error.issues
    .filter((i) => i.path.length === path.length && i.path.every((p, idx) => p === path[idx]))
    .map((i) => i.message)
}

// =============================================================================
// Required sections — property + tax_id
// =============================================================================

describe('propertyCreationSubmissionSchema — required sections', () => {
  it('requires property on contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      path: 'contract',
      rent: validRent(),
      contract: validContract(),
      tax_id: validTaxId(),
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues.some((i) => i.path[0] === 'property')).toBe(true)
  })

  it('requires property on no_contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      path: 'no_contract',
      tax_id: validTaxId(),
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues.some((i) => i.path[0] === 'property')).toBe(true)
  })

  it('requires tax_id on contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      path: 'contract',
      property: validProperty(),
      rent: validRent(),
      contract: validContract(),
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues.some((i) => i.path[0] === 'tax_id')).toBe(true)
  })

  it('requires tax_id on no_contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      path: 'no_contract',
      property: validProperty(),
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues.some((i) => i.path[0] === 'tax_id')).toBe(true)
  })
})

// =============================================================================
// Path-based invariants — contract / no_contract
// =============================================================================

describe('propertyCreationSubmissionSchema — contract path invariants', () => {
  it('accepts a fully valid contract payload', () => {
    const r = propertyCreationSubmissionSchema.safeParse(validContractPayload())
    expect(r.success).toBe(true)
  })

  it('requires contract on path="contract"', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validContractPayload({ contract: undefined }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['contract'])).toContain('contractRequiredOnContractPath')
  })

  it('requires rent on path="contract"', () => {
    const r = propertyCreationSubmissionSchema.safeParse(validContractPayload({ rent: undefined }))
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['rent'])).toContain('rentRequiredOnContractPath')
  })
})

describe('propertyCreationSubmissionSchema — no_contract path invariants', () => {
  it('accepts a minimal no_contract payload (no rent, no contract)', () => {
    const r = propertyCreationSubmissionSchema.safeParse(validNoContractPayload())
    expect(r.success).toBe(true)
  })

  it('allows rent to be present on no_contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({ rent: validRent() }),
    )
    expect(r.success).toBe(true)
  })

  it('forbids contract on no_contract path', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({ contract: validContract() }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['contract'])).toContain('contractForbiddenOnNoContractPath')
  })
})

describe('propertyCreationSubmissionSchema — path', () => {
  it('rejects an unknown path with "invalidPath"', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      ...validNoContractPayload(),
      path: 'somewhere_else',
    })
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['path'])).toContain('invalidPath')
  })

  it('rejects missing path', () => {
    const payload = validNoContractPayload() as Record<string, unknown>
    delete payload.path
    const r = propertyCreationSubmissionSchema.safeParse(payload)
    expect(r.success).toBe(false)
  })
})

// =============================================================================
// Expenses array — accepts empty + valid rows
// =============================================================================

describe('propertyCreationSubmissionSchema — expenses', () => {
  it('accepts an empty expenses array', () => {
    const r = propertyCreationSubmissionSchema.safeParse(validNoContractPayload({ expenses: [] }))
    expect(r.success).toBe(true)
  })

  it('accepts a row with no provider attachment ("unspecified" state)', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({ expenses: [validExpense()] }),
    )
    expect(r.success).toBe(true)
  })

  it('accepts a row attached to a tracked provider profile', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        expenses: [validExpense({ provider_profile_id: VALID_UUID })],
      }),
    )
    expect(r.success).toBe(true)
  })
})

// =============================================================================
// provider_request_draft_index range
// =============================================================================

describe('propertyCreationSubmissionSchema — provider_request_draft_index range', () => {
  it('accepts a draft index pointing at a real draft', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        expenses: [validExpense({ provider_request_draft_index: 0 })],
        provider_request_drafts: [
          {
            requested_provider_name: 'Floripa Energia',
          },
        ],
      }),
    )
    expect(r.success).toBe(true)
  })

  it('rejects an out-of-range provider_request_draft_index', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        expenses: [validExpense({ provider_request_draft_index: 5 })],
        provider_request_drafts: [],
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['expenses', 0, 'provider_request_draft_index'])).toContain(
      'provider_request_draft_index_out_of_range',
    )
  })

  it('rejects a draft index when no drafts are provided', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        expenses: [validExpense({ provider_request_draft_index: 0 })],
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['expenses', 0, 'provider_request_draft_index'])).toContain(
      'provider_request_draft_index_out_of_range',
    )
  })
})

// =============================================================================
// provider_request_drafts.expense_type — narrowed to the enum
// =============================================================================

describe('providerRequestDraftSchema — expense_type narrowed to the enum', () => {
  it('accepts a canonical expense_type', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        provider_request_drafts: [
          {
            requested_provider_name: 'Floripa Energia',
            expense_type: 'electricity',
          },
        ],
      }),
    )
    expect(r.success).toBe(true)
  })

  it('accepts null expense_type (unknown at draft time)', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        provider_request_drafts: [
          {
            requested_provider_name: 'Some Provider',
            expense_type: null,
          },
        ],
      }),
    )
    expect(r.success).toBe(true)
  })

  it('rejects an arbitrary string expense_type with "invalidExpenseType"', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        provider_request_drafts: [
          {
            requested_provider_name: 'Some Provider',
            expense_type: 'not-a-real-type',
          },
        ],
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['provider_request_drafts', 0, 'expense_type'])).toContain(
      'invalidExpenseType',
    )
  })
})

// =============================================================================
// Cross-section parse — composes per-section schemas
// =============================================================================

describe('propertyCreationSubmissionSchema — cross-section composition', () => {
  it('surfaces a property-section error on the property path', () => {
    const r = propertyCreationSubmissionSchema.safeParse({
      ...validNoContractPayload(),
      property: { ...validProperty(), postal_code: '' },
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(
      r.error.issues.some((i) => i.path[0] === 'property' && i.path[1] === 'postal_code'),
    ).toBe(true)
  })

  it('surfaces a rent-section error on the rent path', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validContractPayload({ rent: { ...validRent(), amount_minor: 0 } }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues.some((i) => i.path[0] === 'rent' && i.path[1] === 'amount_minor')).toBe(
      true,
    )
  })

  it('surfaces a row-level provider-attachment conflict on the expenses[i] path', () => {
    const r = propertyCreationSubmissionSchema.safeParse(
      validNoContractPayload({
        expenses: [
          validExpense({
            provider_profile_id: VALID_UUID,
            provider_request_draft_index: 0,
          }),
        ],
        provider_request_drafts: [{ requested_provider_name: 'Some Provider' }],
      }),
    )
    expect(r.success).toBe(false)
    if (r.success) return
    expect(
      r.error.issues.some(
        (i) =>
          i.message === 'provider_attachment_conflict' &&
          i.path.length === 2 &&
          i.path[0] === 'expenses' &&
          i.path[1] === 0,
      ),
    ).toBe(true)
  })

  it('infers the composed type with required property + tax_id keys', () => {
    type Submission = z.infer<typeof propertyCreationSubmissionSchema>
    const _required: Pick<Submission, 'path' | 'property' | 'tax_id'> = {
      path: 'no_contract',
      property: validProperty() as Submission['property'],
      tax_id: validTaxId() as Submission['tax_id'],
    }
    expect(_required.path).toBe('no_contract')
  })
})
