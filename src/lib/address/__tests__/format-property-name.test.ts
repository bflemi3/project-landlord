import { describe, it, expect } from 'vitest'
import { formatPropertyName } from '../format-property-name'

describe('formatPropertyName', () => {
  // =========================================================================
  // Explicit name override — always returned as-is
  // =========================================================================

  it('returns explicit name when provided', () => {
    expect(
      formatPropertyName({
        name: 'Beach House',
        street: 'Rua Augusta',
        number: '123',
        complement: 'Apto 4B',
        country_code: 'BR',
      }),
    ).toBe('Beach House')
  })

  it('trims whitespace from explicit name', () => {
    expect(formatPropertyName({ name: '  My Place  ' })).toBe('My Place')
  })

  it('treats whitespace-only name as empty and falls back to address', () => {
    expect(
      formatPropertyName({
        name: '   ',
        street: 'Rua X',
        number: '1',
        country_code: 'BR',
      }),
    ).toBe('Rua X, 1')
  })

  // =========================================================================
  // Brazilian format (default): street, number, complement
  // =========================================================================

  describe('BR format', () => {
    it('formats street, number, and complement', () => {
      expect(
        formatPropertyName({
          street: 'Avenida Campeche',
          number: '533',
          complement: '7127',
          country_code: 'BR',
        }),
      ).toBe('Avenida Campeche, 533, 7127')
    })

    it('formats street and number without complement', () => {
      expect(
        formatPropertyName({
          street: 'Rua Augusta',
          number: '123',
          country_code: 'BR',
        }),
      ).toBe('Rua Augusta, 123')
    })

    it('formats street only (no number, no complement)', () => {
      expect(
        formatPropertyName({
          street: 'Rua Augusta',
          country_code: 'BR',
        }),
      ).toBe('Rua Augusta')
    })

    it('formats number only', () => {
      expect(
        formatPropertyName({
          number: '42',
          country_code: 'BR',
        }),
      ).toBe('42')
    })

    it('formats complement only', () => {
      expect(
        formatPropertyName({
          complement: 'Bloco B',
          country_code: 'BR',
        }),
      ).toBe('Bloco B')
    })

    it('formats street and complement without number', () => {
      expect(
        formatPropertyName({
          street: 'Rua Augusta',
          complement: 'Bloco B',
          country_code: 'BR',
        }),
      ).toBe('Rua Augusta, Bloco B')
    })

    it('defaults to BR when no country code', () => {
      expect(
        formatPropertyName({
          street: 'Rua Augusta',
          number: '123',
        }),
      ).toBe('Rua Augusta, 123')
    })

    it('is case-insensitive on country code', () => {
      expect(
        formatPropertyName({
          street: 'Rua Augusta',
          number: '123',
          country_code: 'br',
        }),
      ).toBe('Rua Augusta, 123')
    })
  })

  // =========================================================================
  // US/generic format: number street, complement
  // =========================================================================

  describe('US/generic format', () => {
    it('formats number, street, and complement', () => {
      expect(
        formatPropertyName({
          street: 'Main St',
          number: '123',
          complement: 'Apt 4B',
          country_code: 'US',
        }),
      ).toBe('123 Main St, Apt 4B')
    })

    it('formats number and street without complement', () => {
      expect(
        formatPropertyName({
          street: 'Main St',
          number: '456',
          country_code: 'US',
        }),
      ).toBe('456 Main St')
    })

    it('formats street only', () => {
      expect(
        formatPropertyName({
          street: 'Main St',
          country_code: 'US',
        }),
      ).toBe('Main St')
    })

    it('formats number only', () => {
      expect(
        formatPropertyName({
          number: '789',
          country_code: 'US',
        }),
      ).toBe('789')
    })
  })

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('returns empty string when all fields are empty', () => {
      expect(formatPropertyName({})).toBe('')
    })

    it('returns empty string when all fields are whitespace', () => {
      expect(
        formatPropertyName({
          name: '',
          street: '  ',
          number: '',
          complement: '  ',
        }),
      ).toBe('')
    })

    it('trims whitespace from address parts', () => {
      expect(
        formatPropertyName({
          street: '  Rua Augusta  ',
          number: ' 123 ',
          complement: ' Apto 4B ',
          country_code: 'BR',
        }),
      ).toBe('Rua Augusta, 123, Apto 4B')
    })

    it('handles undefined fields gracefully', () => {
      expect(
        formatPropertyName({
          street: undefined,
          number: undefined,
          complement: undefined,
          country_code: 'BR',
        }),
      ).toBe('')
    })

    it('skips empty string fields', () => {
      expect(
        formatPropertyName({
          street: '',
          number: '42',
          complement: '',
          country_code: 'BR',
        }),
      ).toBe('42')
    })
  })
})
