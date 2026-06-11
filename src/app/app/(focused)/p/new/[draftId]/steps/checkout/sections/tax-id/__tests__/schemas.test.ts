import { describe, expect, it } from 'vitest'

import {
  defaultTaxIdInput,
  fallbackTaxIdInputSchema,
  getTaxIdInputSchema,
  TAX_ID_INPUT_FIELD_NAMES,
  taxIdInputSchema,
} from '../schemas'

const VALID_CPF = '52998224725'
const VALID_CNPJ = '49449868000162'

describe('defaultTaxIdInput', () => {
  it('returns an empty tax_id', () => {
    expect(defaultTaxIdInput()).toEqual({ tax_id: '' })
  })
})

describe('TAX_ID_INPUT_FIELD_NAMES', () => {
  it('exposes the schema field names', () => {
    expect(TAX_ID_INPUT_FIELD_NAMES).toEqual(['tax_id'])
  })
})

describe('taxIdInputSchema (BR)', () => {
  it('rejects empty tax_id with `required`', () => {
    const result = taxIdInputSchema.safeParse({ tax_id: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.flatten().fieldErrors.tax_id).toContain('required')
  })

  it('accepts a valid CPF', () => {
    const result = taxIdInputSchema.safeParse({ tax_id: VALID_CPF })
    expect(result.success).toBe(true)
  })

  it('accepts a valid CNPJ (landlord may file as a business)', () => {
    const result = taxIdInputSchema.safeParse({ tax_id: VALID_CNPJ })
    expect(result.success).toBe(true)
  })

  it('rejects a non-empty invalid tax_id with `invalidTaxId`', () => {
    const result = taxIdInputSchema.safeParse({ tax_id: '12345' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.flatten().fieldErrors.tax_id).toContain('invalidTaxId')
  })

  it('rejects a >64 char tax_id with `tooLong`', () => {
    const result = taxIdInputSchema.safeParse({ tax_id: '1'.repeat(65) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.flatten().fieldErrors.tax_id).toContain('tooLong')
  })

  it('trims whitespace before validating', () => {
    const result = taxIdInputSchema.safeParse({
      tax_id: `  ${VALID_CPF}  `,
    })
    expect(result.success).toBe(true)
  })
})

describe('fallbackTaxIdInputSchema (non-BR)', () => {
  it('rejects empty with `required`', () => {
    const result = fallbackTaxIdInputSchema.safeParse({ tax_id: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.flatten().fieldErrors.tax_id).toContain('required')
  })

  it('accepts any non-empty string ≤64 chars', () => {
    expect(fallbackTaxIdInputSchema.safeParse({ tax_id: '12345' }).success).toBe(true)
    expect(fallbackTaxIdInputSchema.safeParse({ tax_id: 'arbitrary-id' }).success).toBe(true)
  })
})

describe('getTaxIdInputSchema dispatcher', () => {
  it('returns the BR schema for "BR"', () => {
    expect(getTaxIdInputSchema('BR')).toBe(taxIdInputSchema)
  })

  it('falls back to the fallback schema for unsupported countries', () => {
    expect(getTaxIdInputSchema('US')).toBe(fallbackTaxIdInputSchema)
    expect(getTaxIdInputSchema('XX')).toBe(fallbackTaxIdInputSchema)
  })

  it('defaults to BR when no country is provided', () => {
    expect(getTaxIdInputSchema()).toBe(taxIdInputSchema)
  })
})
