import { describe, it, expect } from 'vitest'
import { formatAddress, formatAddressHtml } from '../format-address'

describe('formatAddress', () => {
  // ===========================================================================
  // Brazilian format (default)
  // ===========================================================================

  describe('BR format', () => {
    it('formats full address', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        number: '123',
        complement: 'Apto 4B',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123, Apto 4B, Consolação, São Paulo, SP')
    })

    it('formats without complement', () => {
      expect(formatAddress({
        street: 'Avenida Campeche',
        number: '533',
        neighborhood: 'Campeche',
        city: 'Florianópolis',
        state: 'SC',
        countryCode: 'BR',
      })).toBe('Avenida Campeche, 533, Campeche, Florianópolis, SC')
    })

    it('formats without neighborhood', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123, São Paulo, SP')
    })

    it('formats street line only (no location parts)', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        number: '123',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123')
    })

    it('formats location only (no street parts)', () => {
      expect(formatAddress({
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('São Paulo, SP')
    })

    it('formats city only', () => {
      expect(formatAddress({
        city: 'Florianópolis',
        countryCode: 'BR',
      })).toBe('Florianópolis')
    })

    it('formats state only', () => {
      expect(formatAddress({
        state: 'SC',
        countryCode: 'BR',
      })).toBe('SC')
    })

    it('formats neighborhood only', () => {
      expect(formatAddress({
        neighborhood: 'Campeche',
        countryCode: 'BR',
      })).toBe('Campeche')
    })

    it('formats street only', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        countryCode: 'BR',
      })).toBe('Rua Augusta')
    })

    it('defaults to BR when no country code', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        number: '123',
      })).toBe('Rua Augusta, 123')
    })

    it('is case-insensitive on country code', () => {
      expect(formatAddress({
        street: 'Rua Augusta',
        number: '123',
        countryCode: 'br',
      })).toBe('Rua Augusta, 123')
    })
  })

  // ===========================================================================
  // US/generic format
  // ===========================================================================

  describe('US/generic format', () => {
    it('formats full address', () => {
      expect(formatAddress({
        street: 'Main St',
        number: '123',
        complement: 'Apt 4B',
        neighborhood: 'Downtown',
        city: 'Austin',
        state: 'TX',
        countryCode: 'US',
      })).toBe('123 Main St, Apt 4B, Downtown, Austin, TX')
    })

    it('formats without complement', () => {
      expect(formatAddress({
        street: 'Main St',
        number: '456',
        city: 'Austin',
        state: 'TX',
        countryCode: 'US',
      })).toBe('456 Main St, Austin, TX')
    })

    it('formats street only', () => {
      expect(formatAddress({
        street: 'Main St',
        countryCode: 'US',
      })).toBe('Main St')
    })

    it('formats number only', () => {
      expect(formatAddress({
        number: '789',
        countryCode: 'US',
      })).toBe('789')
    })
  })

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('returns empty string when all fields are empty', () => {
      expect(formatAddress({})).toBe('')
    })

    it('returns empty string when all fields are null', () => {
      expect(formatAddress({
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
      })).toBe('')
    })

    it('returns empty string when all fields are whitespace', () => {
      expect(formatAddress({
        street: '  ',
        number: '',
        complement: '  ',
        neighborhood: '',
        city: '  ',
        state: '',
      })).toBe('')
    })

    it('trims whitespace from all parts', () => {
      expect(formatAddress({
        street: '  Rua Augusta  ',
        number: ' 123 ',
        complement: ' Apto 4B ',
        neighborhood: ' Consolação ',
        city: ' São Paulo ',
        state: ' SP ',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123, Apto 4B, Consolação, São Paulo, SP')
    })

    it('handles undefined fields gracefully', () => {
      expect(formatAddress({
        street: undefined,
        number: undefined,
        complement: undefined,
        neighborhood: undefined,
        city: undefined,
        state: undefined,
        countryCode: 'BR',
      })).toBe('')
    })

    it('skips empty string fields in street line', () => {
      expect(formatAddress({
        street: '',
        number: '42',
        complement: '',
        countryCode: 'BR',
      })).toBe('42')
    })

    it('does not produce double commas with sparse location fields', () => {
      expect(formatAddress({
        street: 'Rua X',
        number: '1',
        neighborhood: 'Centro',
        state: 'RJ',
        countryCode: 'BR',
      })).toBe('Rua X, 1, Centro, RJ')
    })
  })
})

describe('formatAddressHtml', () => {
  describe('BR format', () => {
    it('formats full address with br tags, complement on own line', () => {
      expect(formatAddressHtml({
        street: 'Rua Augusta',
        number: '123',
        complement: 'Apto 4B',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123<br>Apto 4B<br>Consolação<br>São Paulo, SP')
    })

    it('formats without complement', () => {
      expect(formatAddressHtml({
        street: 'Avenida Campeche',
        number: '533',
        neighborhood: 'Campeche',
        city: 'Florianópolis',
        state: 'SC',
        countryCode: 'BR',
      })).toBe('Avenida Campeche, 533<br>Campeche<br>Florianópolis, SC')
    })

    it('formats without neighborhood', () => {
      expect(formatAddressHtml({
        street: 'Rua Augusta',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('Rua Augusta, 123<br>São Paulo, SP')
    })

    it('formats city only', () => {
      expect(formatAddressHtml({
        city: 'São Paulo',
        state: 'SP',
        countryCode: 'BR',
      })).toBe('São Paulo, SP')
    })
  })

  describe('US format', () => {
    it('formats full address with br tags, complement on own line', () => {
      expect(formatAddressHtml({
        street: 'Main St',
        number: '123',
        complement: 'Apt 4B',
        neighborhood: 'Downtown',
        city: 'Austin',
        state: 'TX',
        countryCode: 'US',
      })).toBe('123 Main St<br>Apt 4B<br>Downtown<br>Austin, TX')
    })

    it('formats without neighborhood', () => {
      expect(formatAddressHtml({
        street: 'Oak Ave',
        number: '456',
        city: 'Portland',
        state: 'OR',
        countryCode: 'US',
      })).toBe('456 Oak Ave<br>Portland, OR')
    })
  })

  describe('edge cases', () => {
    it('returns empty string for empty fields', () => {
      expect(formatAddressHtml({})).toBe('')
    })

    it('handles null fields', () => {
      expect(formatAddressHtml({
        street: null,
        number: null,
        city: 'São Paulo',
        state: 'SP',
      })).toBe('São Paulo, SP')
    })
  })
})
