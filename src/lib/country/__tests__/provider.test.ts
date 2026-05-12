import { describe, it, expect } from 'vitest'

import { brazilProvider } from '@/lib/address/providers/brazil'
import { fallbackProvider } from '@/lib/address/providers/fallback'
import { brazilTaxIdSchema, fallbackTaxIdSchema } from '@/schemas/tax-id'

import { getCountryProvider } from '../provider'
import { brazilCountryProvider } from '../providers/brazil'
import { fallbackCountryProvider } from '../providers/fallback'

describe('getCountryProvider', () => {
  it('returns the Brazil provider for "BR"', () => {
    expect(getCountryProvider('BR')).toBe(brazilCountryProvider)
  })

  it('returns the fallback provider for an unknown country', () => {
    expect(getCountryProvider('XX')).toBe(fallbackCountryProvider)
  })

  it('returns the fallback provider for an empty string', () => {
    expect(getCountryProvider('')).toBe(fallbackCountryProvider)
  })

  it('is case-sensitive ("br" does not match "BR")', () => {
    expect(getCountryProvider('br')).toBe(fallbackCountryProvider)
  })
})

describe('CountryProvider shape', () => {
  it('exposes both address and taxId sub-providers for Brazil', () => {
    const provider = getCountryProvider('BR')
    expect(provider.code).toBe('BR')
    expect(provider.address).toBeDefined()
    expect(provider.taxId).toBeDefined()
    expect(provider.taxId.schema).toBeDefined()
  })

  it('exposes both address and taxId sub-providers for the fallback', () => {
    const provider = getCountryProvider('XX')
    expect(provider.address).toBeDefined()
    expect(provider.taxId).toBeDefined()
    expect(provider.taxId.schema).toBeDefined()
  })

  it("Brazil's tax-id schema rejects an invalid CPF", () => {
    const result = getCountryProvider('BR').taxId.schema.safeParse('12345678900')
    expect(result.success).toBe(false)
  })

  it("the fallback's tax-id schema accepts arbitrary non-CPF strings", () => {
    const result = getCountryProvider('XX').taxId.schema.safeParse('123-45-6789')
    expect(result.success).toBe(true)
  })

  it("the fallback provider's code is the empty string", () => {
    expect(fallbackCountryProvider.code).toBe('')
  })

  it("Brazil's address sub-provider is the canonical brazilProvider", () => {
    expect(getCountryProvider('BR').address).toBe(brazilProvider)
  })

  it("the fallback's address sub-provider is the canonical fallbackProvider", () => {
    expect(getCountryProvider('XX').address).toBe(fallbackProvider)
  })

  it("Brazil's tax-id schema is the canonical brazilTaxIdSchema", () => {
    expect(getCountryProvider('BR').taxId.schema).toBe(brazilTaxIdSchema)
  })

  it("the fallback's tax-id schema is the canonical fallbackTaxIdSchema", () => {
    expect(getCountryProvider('XX').taxId.schema).toBe(fallbackTaxIdSchema)
  })
})
