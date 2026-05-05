import { describe, it, expect, vi } from 'vitest'
import { brazilProvider } from '../providers/brazil'

// Schema-only tests live in `src/schemas/__tests__/property.test.ts` next to
// the schema declaration. The tests below cover the provider's runtime
// helpers (formatPostalCode, lookupPostalCode, states).

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

    it('returns null when viacep responds with a non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      // New CEP to dodge the in-memory cache populated by sibling tests.
      expect(await brazilProvider.lookupPostalCode('88888888')).toBeNull()
    })

    it('strips formatting before issuing the viacep request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logradouro: '',
            bairro: '',
            localidade: '',
            uf: '',
          }),
      })

      // 77777-777 → 77777777 in the URL; also exercises the digit-normalize
      // path without sharing a cache key with other tests.
      await brazilProvider.lookupPostalCode('77777-777')
      expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/77777777/json/')
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
