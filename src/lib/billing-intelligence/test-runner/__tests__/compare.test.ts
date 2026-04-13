import { describe, it, expect } from 'vitest'
import { resolveField, compareField, compareAllFields } from '../compare'
import type { ExtractionResult } from '../../types'
import { buildExtractionConfidence } from '../../confidence'

const sampleExtraction: ExtractionResult = {
  provider: {
    profileId: 'test-profile',
    companyName: 'Test Co',
    taxId: '12345678000199',
    category: 'electricity',
  },
  customer: {
    name: 'João Silva',
    taxId: '12345678901',
    taxIdType: 'cpf',
    countryCode: 'BR',
    accountNumber: '',
  },
  billing: {
    referenceMonth: '2026-03',
    dueDate: '2026-04-15',
    amountDue: 15000,
    currency: 'BRL',
  },
  payment: {
    linhaDigitavel: '23793381286008301283715748301017194000000000015000',
  },
  confidence: buildExtractionConfidence({
    sourceMethod: 'pdf',
    fields: {
      customerName: { found: true },
      amountDue: { found: true },
    },
  }),
  rawSource: 'pdf',
}

// Extraction with optional consumption present
const extractionWithConsumption: ExtractionResult = {
  ...sampleExtraction,
  consumption: { value: 269, unit: 'kWh' },
}

// Extraction with consumption absent (undefined)
const extractionWithoutConsumption: ExtractionResult = {
  ...sampleExtraction,
  consumption: undefined,
}

describe('resolveField', () => {
  it('resolves top-level path', () => {
    expect(resolveField(sampleExtraction, 'rawSource')).toBe('pdf')
  })

  it('resolves nested path', () => {
    expect(resolveField(sampleExtraction, 'billing.amountDue')).toBe(15000)
  })

  it('resolves two-level nested path', () => {
    expect(resolveField(sampleExtraction, 'provider.taxId')).toBe('12345678000199')
  })

  it('returns undefined for missing leaf', () => {
    expect(resolveField(sampleExtraction, 'billing.nonexistent')).toBeUndefined()
  })

  it('returns undefined for missing intermediate object', () => {
    expect(resolveField(extractionWithoutConsumption, 'consumption.value')).toBeUndefined()
  })

  it('resolves through optional intermediate when present', () => {
    expect(resolveField(extractionWithConsumption, 'consumption.value')).toBe(269)
  })

  it('returns undefined when path resolves to an object (not a primitive)', () => {
    expect(resolveField(sampleExtraction, 'billing')).toBeUndefined()
  })

  it('returns undefined for empty path', () => {
    expect(resolveField(sampleExtraction, '')).toBeUndefined()
  })

  it('returns undefined for optional payment field when absent', () => {
    const noPixExtraction = { ...sampleExtraction, payment: {} }
    expect(resolveField(noPixExtraction, 'payment.pixPayload')).toBeUndefined()
  })
})

describe('compareField', () => {
  it('passes when string values match', () => {
    const result = compareField(sampleExtraction, 'customer.name', 'João Silva')
    expect(result.passed).toBe(true)
    expect(result.actual).toBe('João Silva')
  })

  it('passes when number values match', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', 15000)
    expect(result.passed).toBe(true)
  })

  it('fails when values differ', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', 20000)
    expect(result.passed).toBe(false)
    expect(result.expected).toBe(20000)
    expect(result.actual).toBe(15000)
  })

  it('fails when field is missing from extraction', () => {
    const result = compareField(sampleExtraction, 'billing.nonexistent', 'something')
    expect(result.passed).toBe(false)
    expect(result.actual).toBeUndefined()
  })

  it('coerces when expected is string representation of actual number', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', '15000')
    expect(result.passed).toBe(true)
  })

  it('coerces when actual is string and expected is number', () => {
    // rawSource is 'pdf' (string), expected as number won't match even with coercion
    const result = compareField(sampleExtraction, 'rawSource', 123)
    expect(result.passed).toBe(false)
  })

  it('passes when both actual and expected are empty strings', () => {
    // accountNumber is '' in the sample extraction
    const result = compareField(sampleExtraction, 'customer.accountNumber', '')
    expect(result.passed).toBe(true)
  })

  it('populates field name in result', () => {
    const result = compareField(sampleExtraction, 'billing.dueDate', '2026-04-15')
    expect(result.field).toBe('billing.dueDate')
    expect(result.expected).toBe('2026-04-15')
  })
})

describe('compareAllFields', () => {
  it('compares all expected fields against extraction', () => {
    const results = compareAllFields(sampleExtraction, {
      'customer.name': 'João Silva',
      'billing.amountDue': 15000,
      'billing.dueDate': '2026-04-15',
    })
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.passed)).toBe(true)
  })

  it('returns mix of passed and failed', () => {
    const results = compareAllFields(sampleExtraction, {
      'customer.name': 'João Silva',
      'billing.amountDue': 99999,
    })
    const nameResult = results.find((r) => r.field === 'customer.name')
    const amountResult = results.find((r) => r.field === 'billing.amountDue')
    expect(nameResult?.passed).toBe(true)
    expect(amountResult?.passed).toBe(false)
  })

  it('returns empty array for empty expected fields', () => {
    const results = compareAllFields(sampleExtraction, {})
    expect(results).toHaveLength(0)
  })

  it('handles optional fields that are present', () => {
    const results = compareAllFields(extractionWithConsumption, {
      'consumption.value': 269,
    })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
  })

  it('handles optional fields that are absent', () => {
    const results = compareAllFields(extractionWithoutConsumption, {
      'consumption.value': 269,
    })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].actual).toBeUndefined()
  })
})
