import { describe, it, expect } from 'vitest'
import { fallbackProvider } from '../providers/fallback'

// Schema-only tests live in `src/schemas/__tests__/property.test.ts` next to
// the schema declaration. The tests below cover the provider's runtime
// helpers (formatPostalCode, lookupPostalCode, states).

describe('fallbackProvider', () => {
  describe('formatPostalCode', () => {
    it('returns input unchanged', () => {
      expect(fallbackProvider.formatPostalCode('12345')).toBe('12345')
    })
  })

  describe('lookupPostalCode', () => {
    it('always returns null', async () => {
      expect(await fallbackProvider.lookupPostalCode('12345')).toBeNull()
    })
  })

  describe('states', () => {
    it('has empty states list', () => {
      expect(fallbackProvider.states).toEqual([])
    })
  })
})
