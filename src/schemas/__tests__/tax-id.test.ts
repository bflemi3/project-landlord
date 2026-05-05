import { describe, it, expect } from 'vitest'

import {
  brazilTaxIdSchema,
  fallbackTaxIdSchema,
  getTaxIdSchema,
  taxIdBaseSchema,
} from '../tax-id'

function firstIssue(
  result: ReturnType<typeof brazilTaxIdSchema.safeParse>,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues[0]?.message
}

describe('taxIdBaseSchema', () => {
  it('accepts an empty string', () => {
    expect(taxIdBaseSchema.safeParse('').success).toBe(true)
  })

  it('trims surrounding whitespace', () => {
    expect(taxIdBaseSchema.parse('  abc  ')).toBe('abc')
  })

  it('rejects strings longer than 64 chars with "tooLong"', () => {
    const r = taxIdBaseSchema.safeParse('a'.repeat(65))
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('tooLong')
  })

  it('accepts strings at the 64-char boundary', () => {
    expect(taxIdBaseSchema.safeParse('a'.repeat(64)).success).toBe(true)
  })

  it('rejects non-string input', () => {
    expect(taxIdBaseSchema.safeParse(12345).success).toBe(false)
  })

  it('does not enforce CPF check digits (base, not Brazil)', () => {
    // 11 arbitrary digits — would fail CPF check, but the base schema is
    // structural-only.
    expect(taxIdBaseSchema.safeParse('12345678900').success).toBe(true)
  })
})

describe('brazilTaxIdSchema', () => {
  it('accepts an empty string (optional)', () => {
    expect(brazilTaxIdSchema.safeParse('').success).toBe(true)
  })

  it('accepts a valid formatted CPF', () => {
    expect(brazilTaxIdSchema.safeParse('040.032.329-09').success).toBe(true)
  })

  it('accepts a valid unformatted CPF', () => {
    expect(brazilTaxIdSchema.safeParse('04003232909').success).toBe(true)
  })

  it('trims before validating', () => {
    expect(brazilTaxIdSchema.safeParse('  040.032.329-09  ').success).toBe(true)
  })

  it('rejects a CPF with wrong check digits as "invalidTaxId"', () => {
    const r = brazilTaxIdSchema.safeParse('04003232908')
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('invalidTaxId')
  })

  it('rejects all-same-digit CPFs as "invalidTaxId"', () => {
    const r = brazilTaxIdSchema.safeParse('111.111.111-11')
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('invalidTaxId')
  })

  it('rejects a CPF that is too short as "invalidTaxId"', () => {
    const r = brazilTaxIdSchema.safeParse('123')
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('invalidTaxId')
  })

  it('still enforces the 64-char base length cap', () => {
    const r = brazilTaxIdSchema.safeParse('1'.repeat(65))
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('tooLong')
  })
})

describe('fallbackTaxIdSchema', () => {
  it('accepts arbitrary non-CPF strings', () => {
    expect(fallbackTaxIdSchema.safeParse('123-45-6789').success).toBe(true)
  })

  it('accepts an empty string', () => {
    expect(fallbackTaxIdSchema.safeParse('').success).toBe(true)
  })

  it('does not enforce CPF check digits', () => {
    expect(fallbackTaxIdSchema.safeParse('04003232908').success).toBe(true)
  })

  it('still enforces the 64-char length cap', () => {
    const r = fallbackTaxIdSchema.safeParse('a'.repeat(65))
    expect(r.success).toBe(false)
    expect(firstIssue(r)).toBe('tooLong')
  })
})

describe('getTaxIdSchema — polymorphic dispatcher', () => {
  it('returns the Brazil schema for "BR"', () => {
    expect(getTaxIdSchema('BR')).toBe(brazilTaxIdSchema)
  })

  it('returns the fallback schema for unsupported countries', () => {
    expect(getTaxIdSchema('US')).toBe(fallbackTaxIdSchema)
  })

  it('returns the fallback schema for an empty country code', () => {
    expect(getTaxIdSchema('')).toBe(fallbackTaxIdSchema)
  })

  it('is case-sensitive ("br" does not match "BR")', () => {
    expect(getTaxIdSchema('br')).toBe(fallbackTaxIdSchema)
  })

  it('defaults to Brazil when called without a country code', () => {
    expect(getTaxIdSchema()).toBe(brazilTaxIdSchema)
  })

  it('the dispatched Brazil schema actually validates CPF check digits', () => {
    const schema = getTaxIdSchema('BR')
    expect(schema.safeParse('04003232908').success).toBe(false)
  })

  it('the dispatched fallback schema does not validate CPF check digits', () => {
    const schema = getTaxIdSchema('US')
    expect(schema.safeParse('04003232908').success).toBe(true)
  })
})
