import { describe, it, expect } from 'vitest'
import { contractExtractionResultSchema, contractExtractionLlmSchema } from '../schema'
import type {
  ContractExtractionResult,
  ContractExtractionLlmResult,
  ContractExtractionInput,
  ContractExtractionError,
  ContractExtractionErrorCode,
  ContractExtractionResponse,
  SupportedLanguage,
} from '../types'

// Helper to get a valid full result for runtime tests
function makeValidResult(): ContractExtractionResult {
  return {
    isRentalContract: true,
    propertyType: 'apartment',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: null,
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001-000',
      country: 'BR',
    },
    rent: {
      amount: 250000,
      currency: 'BRL',
      dueDay: 5,
      includes: null,
    },
    contractDates: {
      start: '2026-01-01',
      end: '2027-01-01',
    },
    rentAdjustment: {
      date: '2027-01-01',
      frequency: 'annual',
      method: 'index',
      indexName: 'IPCA',
      value: null,
    },
    landlords: [{ name: 'Maria Silva', taxId: null, email: null }],
    tenants: [{ name: 'Joao Santos', taxId: null, email: null }],
    expenses: null,
    languageDetected: 'pt-br',
    rawExtractedText: 'Contrato de locacao residencial...',
  }
}

// Helper to get a valid LLM-only result (no engine-produced fields)
function makeValidLlmResult(): ContractExtractionLlmResult {
  const { languageDetected, rawExtractedText, ...llmFields } = makeValidResult()
  return llmFields
}

describe('contractExtractionResultSchema', () => {
  const validResult: ContractExtractionResult = {
    isRentalContract: true,
    propertyType: 'apartment',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 4B',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001-000',
      country: 'BR',
    },
    rent: {
      amount: 250000, // R$2,500.00 in centavos
      currency: 'BRL',
      dueDay: 5,
      includes: ['rent', 'condo'],
    },
    contractDates: {
      start: '2026-01-01',
      end: '2027-01-01',
    },
    rentAdjustment: {
      date: '2027-01-01',
      frequency: 'annual',
      method: 'index',
      indexName: 'IPCA',
      value: null,
    },
    landlords: [
      { name: 'Maria Silva', taxId: '123.456.789-00', email: 'maria@example.com' },
    ],
    tenants: [
      { name: 'Joao Santos', taxId: '987.654.321-00', email: 'joao@example.com' },
    ],
    expenses: [
      {
        type: 'electricity',
        bundledInto: null,
        providerName: 'Enel',
        providerTaxId: '12.345.678/0001-90',
      },
    ],
    languageDetected: 'pt-br',
    rawExtractedText: 'Contrato de locacao residencial...',
  }

  it('accepts a fully populated valid result', () => {
    const parsed = contractExtractionResultSchema.parse(validResult)
    expect(parsed.isRentalContract).toBe(true)
    expect(parsed.rent?.amount).toBe(250000)
    expect(parsed.landlords?.[0]?.name).toBe('Maria Silva')
  })

  it('accepts a non-rental-contract result', () => {
    const result = {
      isRentalContract: false,
      propertyType: null,
      address: null,
      rent: null,
      contractDates: null,
      rentAdjustment: null,
      landlords: null,
      tenants: null,
      expenses: null,
      languageDetected: 'en' as const,
      rawExtractedText: 'This is a sales agreement...',
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.isRentalContract).toBe(false)
  })

  it('accepts partial extraction with many null fields', () => {
    const partial = {
      isRentalContract: true,
      propertyType: null,
      address: {
        street: 'Rua X',
        number: null,
        complement: null,
        neighborhood: null,
        city: 'Rio',
        state: 'RJ',
        postalCode: null,
        country: null,
      },
      rent: {
        amount: 150000,
        currency: 'BRL',
        dueDay: null,
        includes: null,
      },
      contractDates: null,
      rentAdjustment: null,
      landlords: [{ name: 'Ana', taxId: null, email: null }],
      tenants: null,
      expenses: null,
      languageDetected: 'pt-br' as const,
      rawExtractedText: 'Texto parcial do contrato...',
    }
    const parsed = contractExtractionResultSchema.parse(partial)
    expect(parsed.address?.street).toBe('Rua X')
    expect(parsed.address?.number).toBeNull()
    expect(parsed.rent?.dueDay).toBeNull()
    expect(parsed.contractDates).toBeNull()
    expect(parsed.propertyType).toBeNull()
  })

  it('requires isRentalContract to be a boolean', () => {
    const invalid = { ...validResult, isRentalContract: 'yes' }
    expect(() => contractExtractionResultSchema.parse(invalid)).toThrow()
  })

  it('requires rent amount to be an integer (minor units)', () => {
    const withFloat = {
      ...validResult,
      rent: { ...validResult.rent, amount: 2500.50 },
    }
    expect(() => contractExtractionResultSchema.parse(withFloat)).toThrow()
  })

  it('requires rent amount to be non-negative', () => {
    const withNegative = {
      ...validResult,
      rent: { ...validResult.rent, amount: -100 },
    }
    expect(() => contractExtractionResultSchema.parse(withNegative)).toThrow()
  })

  it('requires dueDay to be between 1 and 31 when present', () => {
    const invalidDay = {
      ...validResult,
      rent: { ...validResult.rent, dueDay: 32 },
    }
    expect(() => contractExtractionResultSchema.parse(invalidDay)).toThrow()

    const zeroDay = {
      ...validResult,
      rent: { ...validResult.rent, dueDay: 0 },
    }
    expect(() => contractExtractionResultSchema.parse(zeroDay)).toThrow()
  })

  it('rejects unknown language values', () => {
    const invalid = { ...validResult, languageDetected: 'fr' }
    expect(() => contractExtractionResultSchema.parse(invalid)).toThrow()
  })

  it('requires rawExtractedText', () => {
    const { rawExtractedText, ...noText } = validResult
    expect(() => contractExtractionResultSchema.parse(noText)).toThrow()
  })

  it('accepts landlords/tenants with all optional fields null', () => {
    const result = {
      ...validResult,
      landlords: [{ name: null, taxId: null, email: null }],
      tenants: [{ name: null, taxId: null, email: null }],
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.landlords?.[0]?.name).toBeNull()
  })

  it('accepts expenses with all optional fields null', () => {
    const result = {
      ...validResult,
      expenses: [{ type: null, bundledInto: null, providerName: null, providerTaxId: null }],
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.expenses?.[0]?.type).toBeNull()
  })

  it('accepts rent without includes array', () => {
    const result = {
      ...validResult,
      rent: { amount: 200000, currency: 'BRL', dueDay: 10, includes: null },
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.rent?.includes).toBeNull()
  })
})

describe('contractExtractionLlmSchema', () => {
  it('accepts a valid LLM result without engine fields', () => {
    const llmResult = makeValidLlmResult()
    const parsed = contractExtractionLlmSchema.parse(llmResult)
    expect(parsed.isRentalContract).toBe(true)
    expect(parsed.rent?.amount).toBe(250000)
  })

  it('does not require languageDetected or rawExtractedText', () => {
    const llmResult = makeValidLlmResult()
    // These fields should not exist on the LLM result
    expect('languageDetected' in llmResult).toBe(false)
    expect('rawExtractedText' in llmResult).toBe(false)
    expect(() => contractExtractionLlmSchema.parse(llmResult)).not.toThrow()
  })

  it('rejects invalid LLM fields the same as the full schema', () => {
    const llmResult = makeValidLlmResult()
    const withFloat = {
      ...llmResult,
      rent: { ...llmResult.rent, amount: 2500.50 },
    }
    expect(() => contractExtractionLlmSchema.parse(withFloat)).toThrow()
  })

  it('accepts a minimal non-contract LLM result', () => {
    const result = {
      isRentalContract: false,
      propertyType: null,
      address: null,
      rent: null,
      contractDates: null,
      rentAdjustment: null,
      landlords: null,
      tenants: null,
      expenses: null,
    }
    const parsed = contractExtractionLlmSchema.parse(result)
    expect(parsed.isRentalContract).toBe(false)
  })
})

describe('expense type on contractExtractionResultSchema', () => {
  const canonicalTypes = [
    'electricity',
    'water',
    'gas',
    'internet',
    'condo',
    'trash',
    'sewer',
    'cable',
    'maintenance',
    'other',
  ] as const

  it.each(canonicalTypes)('accepts expense type %s', (type) => {
    const result = {
      ...makeValidResult(),
      expenses: [{ type, bundledInto: null, providerName: null, providerTaxId: null }],
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.expenses?.[0]?.type).toBe(type)
  })

  it('accepts null expense type', () => {
    const result = {
      ...makeValidResult(),
      expenses: [{ type: null, bundledInto: null, providerName: null, providerTaxId: null }],
    }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.expenses?.[0]?.type).toBeNull()
  })

  it('rejects non-canonical expense types (native-language terms)', () => {
    const ptBrNative = {
      ...makeValidResult(),
      expenses: [{ type: 'água', bundledInto: null, providerName: null, providerTaxId: null }],
    }
    expect(() => contractExtractionResultSchema.parse(ptBrNative)).toThrow()

    const esNative = {
      ...makeValidResult(),
      expenses: [{ type: 'energía eléctrica', bundledInto: null, providerName: null, providerTaxId: null }],
    }
    expect(() => contractExtractionResultSchema.parse(esNative)).toThrow()

    const freeform = {
      ...makeValidResult(),
      expenses: [{ type: 'property_tax', bundledInto: null, providerName: null, providerTaxId: null }],
    }
    expect(() => contractExtractionResultSchema.parse(freeform)).toThrow()
  })
})

describe('expense.bundledInto on contractExtractionResultSchema', () => {
  const makeExpense = (bundledInto: unknown) => ({
    type: 'water' as const,
    bundledInto,
    providerName: null,
    providerTaxId: null,
  })

  it('accepts null (expense has its own bill)', () => {
    const result = { ...makeValidResult(), expenses: [makeExpense(null)] }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.expenses?.[0]?.bundledInto).toBeNull()
  })

  it('accepts "rent" literal (bundled into rent payment)', () => {
    const result = { ...makeValidResult(), expenses: [makeExpense('rent')] }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.expenses?.[0]?.bundledInto).toBe('rent')
  })

  it.each(['condo', 'electricity', 'water', 'gas', 'other'] as const)(
    'accepts canonical expense type %s as parent',
    (parentType) => {
      const result = { ...makeValidResult(), expenses: [makeExpense(parentType)] }
      const parsed = contractExtractionResultSchema.parse(result)
      expect(parsed.expenses?.[0]?.bundledInto).toBe(parentType)
    },
  )

  it('rejects non-canonical strings', () => {
    const result = { ...makeValidResult(), expenses: [makeExpense('hoa')] }
    expect(() => contractExtractionResultSchema.parse(result)).toThrow()

    const freeform = { ...makeValidResult(), expenses: [makeExpense('utilities')] }
    expect(() => contractExtractionResultSchema.parse(freeform)).toThrow()
  })

  it('requires the field to be present on every expense', () => {
    const missing = {
      ...makeValidResult(),
      expenses: [{ type: 'water', providerName: null, providerTaxId: null }],
    }
    expect(() => contractExtractionResultSchema.parse(missing)).toThrow()
  })
})

describe('propertyType on contractExtractionResultSchema', () => {
  it.each(['apartment', 'house', 'commercial', 'other'] as const)(
    'accepts propertyType %s',
    (propertyType) => {
      const result = { ...makeValidResult(), propertyType }
      const parsed = contractExtractionResultSchema.parse(result)
      expect(parsed.propertyType).toBe(propertyType)
    },
  )

  it('accepts null propertyType', () => {
    const result = { ...makeValidResult(), propertyType: null }
    const parsed = contractExtractionResultSchema.parse(result)
    expect(parsed.propertyType).toBeNull()
  })

  it('rejects propertyType values outside the enum', () => {
    const withInvalid = { ...makeValidResult(), propertyType: 'studio' }
    expect(() => contractExtractionResultSchema.parse(withInvalid)).toThrow()
  })

  it('rejects freeform strings as propertyType', () => {
    const withFreeform = { ...makeValidResult(), propertyType: 'apartamento' }
    expect(() => contractExtractionResultSchema.parse(withFreeform)).toThrow()
  })

  it('requires propertyType to be present', () => {
    const { propertyType: _omit, ...missing } = makeValidResult()
    expect(() => contractExtractionResultSchema.parse(missing)).toThrow()
  })
})

describe('ContractExtractionResponse type', () => {
  it('discriminated union — success case', () => {
    const response: ContractExtractionResponse = {
      success: true,
      data: makeValidResult(),
    }
    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data.isRentalContract).toBe(true)
    }
  })

  it('discriminated union — error case', () => {
    const response: ContractExtractionResponse = {
      success: false,
      error: { code: 'not_a_contract' },
    }
    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('not_a_contract')
    }
  })
})

describe('ContractExtractionErrorCode', () => {
  it('all error codes are strongly typed', () => {
    // This test verifies the type at compile time — we just enumerate them
    const codes: ContractExtractionErrorCode[] = [
      'file_too_large',
      'unsupported_format',
      'corrupt_file',
      'empty_file',
      'no_text_extractable',
      'password_protected',
      'unsupported_language',
      'not_a_contract',
      'extraction_failed',
      'extraction_timeout',
      'rate_limited',
      'api_key_missing',
    ]
    expect(codes).toHaveLength(12)
  })
})

describe('ContractExtractionInput type', () => {
  it('accepts valid input shape', () => {
    const input: ContractExtractionInput = {
      fileBuffer: Buffer.from('test'),
      fileType: 'pdf',
    }
    expect(input.fileType).toBe('pdf')
  })

  it('accepts docx file type', () => {
    const input: ContractExtractionInput = {
      fileBuffer: Buffer.from('test'),
      fileType: 'docx',
    }
    expect(input.fileType).toBe('docx')
  })
})

describe('SupportedLanguage type', () => {
  it('covers all supported languages', () => {
    const languages: SupportedLanguage[] = ['pt-br', 'en', 'es']
    expect(languages).toHaveLength(3)
  })
})
