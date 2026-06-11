import { describe, it, expect } from 'vitest'

import { getTenantInputSchema, tenantInputSchema } from '../tenant'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Maria Silva',
    email: 'maria@example.com',
    taxId: '040.032.329-09',
    inviteNow: true,
    ...overrides,
  }
}

function firstIssue(
  result: ReturnType<typeof tenantInputSchema.safeParse>,
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('tenantInputSchema — happy paths', () => {
  it('accepts a complete tenant input', () => {
    expect(tenantInputSchema.safeParse(valid()).success).toBe(true)
  })

  it('accepts inviteNow=false (email still required for input)', () => {
    expect(tenantInputSchema.safeParse(valid({ inviteNow: false })).success).toBe(true)
  })
})

describe('tenantInputSchema — name', () => {
  it('rejects empty name with "required"', () => {
    const r = tenantInputSchema.safeParse(valid({ name: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'name')).toBe('required')
  })

  it('rejects whitespace-only name with "required" (post-trim)', () => {
    const r = tenantInputSchema.safeParse(valid({ name: '   ' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'name')).toBe('required')
  })

  it('rejects name over 200 chars with "tooLong"', () => {
    const r = tenantInputSchema.safeParse(valid({ name: 'a'.repeat(201) }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'name')).toBe('tooLong')
  })

  it('accepts a name at exactly 200 chars', () => {
    expect(tenantInputSchema.safeParse(valid({ name: 'a'.repeat(200) })).success).toBe(true)
  })
})

describe('tenantInputSchema — email', () => {
  it('rejects empty email', () => {
    const r = tenantInputSchema.safeParse(valid({ email: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })

  it('rejects malformed email with "invalidEmail"', () => {
    const r = tenantInputSchema.safeParse(valid({ email: 'not-an-email' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })
})

describe('tenantInputSchema — taxId (default Brazil)', () => {
  it('accepts a valid formatted CPF', () => {
    expect(tenantInputSchema.safeParse(valid({ taxId: '040.032.329-09' })).success).toBe(true)
  })

  it('accepts a valid unformatted CPF', () => {
    expect(tenantInputSchema.safeParse(valid({ taxId: '04003232909' })).success).toBe(true)
  })

  it('accepts an empty taxId (optional in base schema)', () => {
    expect(tenantInputSchema.safeParse(valid({ taxId: '' })).success).toBe(true)
  })

  it('rejects a CPF with wrong check digits as "invalidTaxId"', () => {
    const r = tenantInputSchema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })

  it('rejects all-same-digit CPFs as "invalidTaxId"', () => {
    const r = tenantInputSchema.safeParse(valid({ taxId: '111.111.111-11' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })

  it('rejects a taxId longer than 64 chars with "tooLong"', () => {
    const r = tenantInputSchema.safeParse(valid({ taxId: '1'.repeat(65) }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('tooLong')
  })

  it('trims surrounding whitespace before CPF validation', () => {
    expect(tenantInputSchema.safeParse(valid({ taxId: '  040.032.329-09  ' })).success).toBe(true)
  })
})

describe('getTenantInputSchema — polymorphic dispatcher', () => {
  it('returns the Brazil schema when countryCode is "BR"', () => {
    const schema = getTenantInputSchema('BR')
    const r = schema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })

  it('returns a relaxed schema for unsupported countries (no CPF check)', () => {
    const schema = getTenantInputSchema('US')
    expect(schema.safeParse(valid({ taxId: '123-45-6789' })).success).toBe(true)
  })

  it('still requires email regardless of country', () => {
    const schema = getTenantInputSchema('US')
    const r = schema.safeParse(valid({ email: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })

  it('defaults to the Brazil schema when no country code is provided', () => {
    const schema = getTenantInputSchema()
    const r = schema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })

  it('still rejects malformed email under fallback country', () => {
    const schema = getTenantInputSchema('US')
    const r = schema.safeParse(valid({ email: 'not-an-email' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })
})
