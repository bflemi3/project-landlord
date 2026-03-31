import { describe, it, expect } from 'vitest'
import { getAddressProvider } from '../provider'
import { brazilProvider } from '../providers/brazil'
import { fallbackProvider } from '../providers/fallback'

describe('getAddressProvider', () => {
  it('returns brazil provider for BR', () => {
    expect(getAddressProvider('BR')).toBe(brazilProvider)
  })

  it('returns fallback provider for unknown country', () => {
    expect(getAddressProvider('XX')).toBe(fallbackProvider)
  })

  it('returns fallback provider for empty string', () => {
    expect(getAddressProvider('')).toBe(fallbackProvider)
  })

  it('is case-sensitive (br does not match BR)', () => {
    expect(getAddressProvider('br')).toBe(fallbackProvider)
  })
})
