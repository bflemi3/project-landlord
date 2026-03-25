import { describe, it, expect, vi } from 'vitest'
import { brazilProvider } from '../providers/brazil'

describe('brazilProvider', () => {
  describe('formatPostalCode', () => {
    it('formats 5 digits without hyphen', () => {
      expect(brazilProvider.formatPostalCode('01310')).toBe('01310')
    })

    it('formats 8 digits with hyphen', () => {
      expect(brazilProvider.formatPostalCode('01310100')).toBe('01310-100')
    })

    it('strips non-digits before formatting', () => {
      expect(brazilProvider.formatPostalCode('01310-100')).toBe('01310-100')
    })

    it('handles partial input', () => {
      expect(brazilProvider.formatPostalCode('013')).toBe('013')
    })

    it('handles empty string', () => {
      expect(brazilProvider.formatPostalCode('')).toBe('')
    })
  })

  describe('validateAddress', () => {
    const validAddress = {
      postal_code: '01310-100',
      street: 'Rua Augusta',
      number: '123',
      city: 'São Paulo',
      state: 'SP',
    }

    it('returns null for valid address', () => {
      expect(brazilProvider.validateAddress(validAddress)).toBeNull()
    })

    it('returns null with optional fields included', () => {
      expect(brazilProvider.validateAddress({
        ...validAddress,
        complement: 'Bloco B',
        neighborhood: 'Consolação',
      })).toBeNull()
    })

    // Required fields
    it('requires postal_code', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, postal_code: undefined })
      expect(result?.postal_code).toBe('required')
    })

    it('requires street', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, street: undefined })
      expect(result?.street).toBe('required')
    })

    it('requires number', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, number: undefined })
      expect(result?.number).toBe('required')
    })

    it('requires city', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, city: undefined })
      expect(result?.city).toBe('required')
    })

    it('requires state', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, state: undefined })
      expect(result?.state).toBe('required')
    })

    it('returns all errors for empty address', () => {
      const result = brazilProvider.validateAddress({})
      expect(result).toEqual({
        postal_code: 'required',
        street: 'required',
        number: 'required',
        city: 'required',
        state: 'required',
      })
    })

    // Postal code validation
    it('rejects postal code with wrong length', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, postal_code: '123' })
      expect(result?.postal_code).toBe('invalidPostalCode')
    })

    it('accepts postal code with hyphen', () => {
      expect(brazilProvider.validateAddress({ ...validAddress, postal_code: '01310-100' })).toBeNull()
    })

    it('accepts postal code without hyphen', () => {
      expect(brazilProvider.validateAddress({ ...validAddress, postal_code: '01310100' })).toBeNull()
    })

    // Max length validation
    it('rejects street over 200 chars', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, street: 'a'.repeat(201) })
      expect(result?.street).toBe('tooLong')
    })

    it('rejects number over 20 chars', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, number: '1'.repeat(21) })
      expect(result?.number).toBe('tooLong')
    })

    it('rejects complement over 100 chars', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, complement: 'a'.repeat(101) })
      expect(result?.complement).toBe('tooLong')
    })

    it('rejects neighborhood over 100 chars', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, neighborhood: 'a'.repeat(101) })
      expect(result?.neighborhood).toBe('tooLong')
    })

    it('rejects city over 100 chars', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, city: 'a'.repeat(101) })
      expect(result?.city).toBe('tooLong')
    })

    // City validation
    it('rejects city with digits', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, city: 'São Paulo 123' })
      expect(result?.city).toBe('invalidCity')
    })

    it('accepts city with accents and hyphens', () => {
      expect(brazilProvider.validateAddress({ ...validAddress, city: 'São José dos Campos' })).toBeNull()
    })

    // State validation
    it('rejects invalid state code', () => {
      const result = brazilProvider.validateAddress({ ...validAddress, state: 'XX' })
      expect(result?.state).toBe('invalidState')
    })

    it('accepts lowercase state code', () => {
      expect(brazilProvider.validateAddress({ ...validAddress, state: 'sp' })).toBeNull()
    })

    it('accepts all valid state codes', () => {
      const codes = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
      for (const code of codes) {
        expect(brazilProvider.validateAddress({ ...validAddress, state: code })).toBeNull()
      }
    })
  })

  describe('lookupPostalCode', () => {
    it('returns null for short input', async () => {
      expect(await brazilProvider.lookupPostalCode('123')).toBeNull()
    })

    it('returns null for empty input', async () => {
      expect(await brazilProvider.lookupPostalCode('')).toBeNull()
    })

    it('calls viacep for 8-digit input', async () => {
      const mockResponse = {
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await brazilProvider.lookupPostalCode('01310100')
      expect(result).toEqual({
        street: 'Avenida Paulista',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      })

      expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/')
    })

    it('returns null when viacep returns erro', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ erro: true }),
      })

      expect(await brazilProvider.lookupPostalCode('00000000')).toBeNull()
    })

    it('returns null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      // Use a different CEP to avoid cache hit from previous test
      expect(await brazilProvider.lookupPostalCode('99999999')).toBeNull()
    })
  })

  describe('states', () => {
    it('has 27 states (26 + DF)', () => {
      expect(brazilProvider.states).toHaveLength(27)
    })

    it('each state has code and name', () => {
      for (const state of brazilProvider.states) {
        expect(state.code).toMatch(/^[A-Z]{2}$/)
        expect(state.name.length).toBeGreaterThan(0)
      }
    })
  })
})
