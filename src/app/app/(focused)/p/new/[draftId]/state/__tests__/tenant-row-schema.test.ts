import { describe, it, expect } from 'vitest'

import {
  defaultTenantRow,
  getTenantRowSchema,
  tenantRowFromContractParty,
  tenantRowSchema,
} from '../tenant-row-schema'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    id: 'demo-id',
    name: 'Maria Silva',
    email: 'maria@example.com',
    taxId: '040.032.329-09',
    inviteNow: true,
    isExtracted: false,
    ...overrides,
  }
}

function firstIssue(
  result: ReturnType<typeof tenantRowSchema.safeParse>,
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('tenantRowSchema — happy paths', () => {
  it('accepts a complete row with invite on', () => {
    expect(tenantRowSchema.safeParse(valid()).success).toBe(true)
  })

  it('accepts inviteNow=false with empty email (relaxed vs canonical input)', () => {
    expect(
      tenantRowSchema.safeParse(valid({ inviteNow: false, email: '' })).success,
    ).toBe(true)
  })

  it('accepts inviteNow=false with a valid email', () => {
    expect(
      tenantRowSchema.safeParse(valid({ inviteNow: false })).success,
    ).toBe(true)
  })
})

describe('tenantRowSchema — bookkeeping fields', () => {
  it('rejects an empty id', () => {
    expect(tenantRowSchema.safeParse(valid({ id: '' })).success).toBe(false)
  })

  it('requires isExtracted to be a boolean', () => {
    expect(
      tenantRowSchema.safeParse({ ...valid(), isExtracted: undefined }).success,
    ).toBe(false)
  })
})

describe('tenantRowSchema — email when invite is ON', () => {
  it('rejects empty email with "required"', () => {
    const r = tenantRowSchema.safeParse(valid({ inviteNow: true, email: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('required')
  })

  it('rejects malformed email with "invalidEmail"', () => {
    const r = tenantRowSchema.safeParse(
      valid({ inviteNow: true, email: 'not-an-email' }),
    )
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })
})

describe('tenantRowSchema — email when invite is OFF', () => {
  it('accepts empty email', () => {
    expect(
      tenantRowSchema.safeParse(valid({ inviteNow: false, email: '' })).success,
    ).toBe(true)
  })

  it('accepts whitespace-only email (trimmed to empty before email check)', () => {
    expect(
      tenantRowSchema.safeParse(valid({ inviteNow: false, email: '   ' }))
        .success,
    ).toBe(true)
  })

  it('rejects malformed non-empty email with "invalidEmail"', () => {
    const r = tenantRowSchema.safeParse(
      valid({ inviteNow: false, email: 'not-an-email' }),
    )
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })
})

describe('tenantRowSchema — email when invite is ON (whitespace handling)', () => {
  it('treats whitespace-only email as empty and rejects with "required"', () => {
    const r = tenantRowSchema.safeParse(
      valid({ inviteNow: true, email: '   ' }),
    )
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('required')
  })
})

describe('tenantRowSchema — taxId (default Brazil)', () => {
  it('accepts a valid CPF', () => {
    expect(
      tenantRowSchema.safeParse(valid({ taxId: '040.032.329-09' })).success,
    ).toBe(true)
  })

  it('accepts an empty taxId', () => {
    expect(tenantRowSchema.safeParse(valid({ taxId: '' })).success).toBe(true)
  })

  it('rejects an invalid CPF with "invalidTaxId"', () => {
    const r = tenantRowSchema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })
})

describe('getTenantRowSchema — polymorphic dispatcher', () => {
  it('returns the Brazil row schema for "BR"', () => {
    const schema = getTenantRowSchema('BR')
    const r = schema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })

  it('returns a relaxed row schema for unsupported countries', () => {
    const schema = getTenantRowSchema('US')
    expect(schema.safeParse(valid({ taxId: '123-45-6789' })).success).toBe(true)
  })

  it('preserves the relaxed-email rule across countries', () => {
    const schema = getTenantRowSchema('US')
    expect(
      schema.safeParse(valid({ inviteNow: false, email: '' })).success,
    ).toBe(true)
  })

  it('preserves the invite-on email-required rule across countries', () => {
    const schema = getTenantRowSchema('US')
    const r = schema.safeParse(valid({ inviteNow: true, email: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('required')
  })

  it('defaults to the Brazil row schema when no country code is provided', () => {
    const schema = getTenantRowSchema()
    const r = schema.safeParse(valid({ taxId: '04003232908' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'taxId')).toBe('invalidTaxId')
  })
})

describe('defaultTenantRow', () => {
  it('returns empty strings for name, email, and taxId', () => {
    const t = defaultTenantRow()
    expect(t.name).toBe('')
    expect(t.email).toBe('')
    expect(t.taxId).toBe('')
  })

  it('defaults inviteNow to true', () => {
    expect(defaultTenantRow().inviteNow).toBe(true)
  })

  it('defaults isExtracted to false for manually-added rows', () => {
    expect(defaultTenantRow().isExtracted).toBe(false)
  })

  it('generates a non-empty id', () => {
    expect(defaultTenantRow().id.length).toBeGreaterThan(0)
  })

  it('generates a unique id on each call', () => {
    expect(defaultTenantRow().id).not.toBe(defaultTenantRow().id)
  })
})

describe('tenantRowFromContractParty', () => {
  it('maps name, email, and taxId from a fully populated party', () => {
    const t = tenantRowFromContractParty({
      name: 'Maria Silva',
      email: 'maria@example.com',
      taxId: '040.032.329-09',
    })
    expect(t.name).toBe('Maria Silva')
    expect(t.email).toBe('maria@example.com')
    expect(t.taxId).toBe('040.032.329-09')
  })

  it('coerces null fields to empty strings', () => {
    const t = tenantRowFromContractParty({ name: null, email: null, taxId: null })
    expect(t.name).toBe('')
    expect(t.email).toBe('')
    expect(t.taxId).toBe('')
  })

  it('marks the row as extracted', () => {
    const t = tenantRowFromContractParty({ name: 'X', email: null, taxId: null })
    expect(t.isExtracted).toBe(true)
  })

  it('defaults inviteNow to true', () => {
    const t = tenantRowFromContractParty({ name: 'X', email: null, taxId: null })
    expect(t.inviteNow).toBe(true)
  })

  it('generates a fresh unique id per call', () => {
    const a = tenantRowFromContractParty({ name: 'A', email: null, taxId: null })
    const b = tenantRowFromContractParty({ name: 'B', email: null, taxId: null })
    expect(a.id).not.toBe(b.id)
  })

  it('generates a non-empty id', () => {
    const t = tenantRowFromContractParty({ name: 'X', email: null, taxId: null })
    expect(t.id.length).toBeGreaterThan(0)
  })

  it('drops invalid BR taxId placeholders (e.g. "XXX") to empty string', () => {
    const t = tenantRowFromContractParty({
      name: 'Brandon',
      email: null,
      taxId: 'XXX',
    })
    expect(t.taxId).toBe('')
  })

  it('drops a numeric string that fails CPF check digits to empty string', () => {
    const t = tenantRowFromContractParty({
      name: 'Brandon',
      email: null,
      taxId: '11111111111',
    })
    expect(t.taxId).toBe('')
  })

  it('formats a valid unformatted BR taxId via the CPF mask', () => {
    const t = tenantRowFromContractParty({
      name: 'Maria',
      email: null,
      taxId: '04003232909',
    })
    expect(t.taxId).toBe('040.032.329-09')
  })

  it('passes a valid pre-formatted BR taxId through unchanged', () => {
    const t = tenantRowFromContractParty({
      name: 'Maria',
      email: null,
      taxId: '040.032.329-09',
    })
    expect(t.taxId).toBe('040.032.329-09')
  })

  it('passes taxId through unchanged for non-BR country codes', () => {
    const t = tenantRowFromContractParty(
      { name: 'Alex', email: null, taxId: '123-45-6789' },
      'US',
    )
    expect(t.taxId).toBe('123-45-6789')
  })

  it('title-cases an all-uppercase extracted name', () => {
    const t = tenantRowFromContractParty({
      name: 'BRANDON FLEMMING',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Brandon Flemming')
  })

  it('handles all-uppercase accented names', () => {
    const t = tenantRowFromContractParty({
      name: 'JOÃO SANTOS',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('João Santos')
  })

  it('passes an already title-cased name through unchanged', () => {
    const t = tenantRowFromContractParty({
      name: 'Maria Silva',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Maria Silva')
  })

  it('title-cases a fully lowercase name', () => {
    const t = tenantRowFromContractParty({
      name: 'maria silva',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Maria Silva')
  })

  it('title-cases a partially-cased name', () => {
    const t = tenantRowFromContractParty({
      name: 'Maria silva',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Maria Silva')
  })

  it('flattens internal capitals (intentional trade-off for consistent normalization)', () => {
    const t = tenantRowFromContractParty({
      name: 'Connor McDonald',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Connor Mcdonald')
  })

  it('trims surrounding whitespace from the name', () => {
    const t = tenantRowFromContractParty({
      name: '  BRANDON  FLEMMING  ',
      email: null,
      taxId: null,
    })
    expect(t.name).toBe('Brandon Flemming')
  })
})
