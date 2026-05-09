import { describe, expect, it } from 'vitest'

import { defaultTenantRow, type TenantRow } from '../schemas'
import { validateTenants } from '../validation'

describe('validateTenants', () => {
  it('returns ok=true with an empty perRow for an empty list', () => {
    const result = validateTenants([], 'BR')
    expect(result.ok).toBe(true)
    expect(result.perRow.size).toBe(0)
  })

  it('returns ok=false when any row fails the country-aware schema', () => {
    const valid: TenantRow = {
      ...defaultTenantRow(),
      name: 'Ana',
      email: 'ana@example.com',
      taxId: '52998224725', // valid CPF
      inviteNow: true,
    }
    const invalid: TenantRow = {
      ...defaultTenantRow(),
      name: '',
      inviteNow: true,
    }
    const result = validateTenants([valid, invalid], 'BR')
    expect(result.ok).toBe(false)
    expect(result.perRow.get(valid.id)?.success).toBe(true)
    expect(result.perRow.get(invalid.id)?.success).toBe(false)
  })

  it('returns the same cached result for the same (rows, country) tuple', () => {
    const rows: TenantRow[] = [defaultTenantRow()]
    const first = validateTenants(rows, 'BR')
    const second = validateTenants(rows, 'BR')
    expect(second).toBe(first)
  })

  it('returns a different cached result when only the country changes', () => {
    const rows: TenantRow[] = [defaultTenantRow()]
    const br = validateTenants(rows, 'BR')
    const us = validateTenants(rows, 'US')
    expect(us).not.toBe(br)
  })
})
