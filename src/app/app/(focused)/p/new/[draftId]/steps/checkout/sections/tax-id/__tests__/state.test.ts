import { describe, expect, it } from 'vitest'

import { defaultTaxIdInput } from '../schemas'
import { isDefault, setAllTouched } from '../state'

describe('tax-id/state — setAllTouched', () => {
  it('returns a Set with the tax_id field when called with an empty Set', () => {
    const next = setAllTouched(new Set())
    expect(next.has('tax_id')).toBe(true)
  })

  it('short-circuits when prev already contains every field (returns the same ref)', () => {
    const full = setAllTouched(new Set())
    expect(setAllTouched(full)).toBe(full)
  })
})

describe('tax-id/state — isDefault', () => {
  it('returns true for undefined slice', () => {
    expect(isDefault(undefined)).toBe(true)
  })

  it('returns true for the seeded default (empty tax_id)', () => {
    expect(isDefault(defaultTaxIdInput())).toBe(true)
  })

  it('returns false when tax_id is non-empty', () => {
    expect(isDefault({ tax_id: '12345' })).toBe(false)
  })
})
