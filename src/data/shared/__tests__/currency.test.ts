import { describe, expect, it } from 'vitest'

import { MAX_MINOR_UNITS, SUPPORTED_CURRENCIES, coerceCurrency } from '../currency'

describe('shared currency config', () => {
  it('defines the supported currency set used by money inputs and schemas', () => {
    expect(SUPPORTED_CURRENCIES).toEqual(['BRL', 'USD'])
  })

  it('uses the shared 10-digit minor-unit cap', () => {
    expect(MAX_MINOR_UNITS).toBe(99_999_999_99)
  })
})

describe('coerceCurrency', () => {
  it('preserves supported currency codes', () => {
    expect(coerceCurrency('BRL')).toBe('BRL')
    expect(coerceCurrency('USD')).toBe('USD')
  })

  it('falls back to BRL for null, undefined, and unsupported codes', () => {
    expect(coerceCurrency(null)).toBe('BRL')
    expect(coerceCurrency(undefined)).toBe('BRL')
    expect(coerceCurrency('EUR')).toBe('BRL')
  })
})
