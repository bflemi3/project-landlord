import { describe, it, expect } from 'vitest'
import { addressSchema, fallbackProvider } from '../providers/fallback'

describe('fallbackProvider', () => {
  describe('addressSchema', () => {
    it('defaults optional persisted address fields', () => {
      expect(addressSchema.parse({
        street: '123 Main St',
        city: 'Springfield',
      })).toEqual({
        postal_code: '',
        street: '123 Main St',
        number: '',
        complement: '',
        neighborhood: '',
        city: 'Springfield',
        state: '',
      })
    })
  })

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

  describe('validateAddress', () => {
    it('returns null for valid address', () => {
      expect(fallbackProvider.validateAddress({
        street: '123 Main St',
        city: 'Springfield',
      })).toBeNull()
    })

    it('requires street', () => {
      const result = fallbackProvider.validateAddress({ city: 'Springfield' })
      expect(result?.street).toEqual(['required'])
    })

    it('requires city', () => {
      const result = fallbackProvider.validateAddress({ street: '123 Main St' })
      expect(result?.city).toEqual(['required'])
    })

    it('returns all errors for empty address', () => {
      expect(fallbackProvider.validateAddress({})).toEqual({
        street: ['required'],
        city: ['required'],
      })
    })
  })

  describe('states', () => {
    it('has empty states list', () => {
      expect(fallbackProvider.states).toEqual([])
    })
  })
})
