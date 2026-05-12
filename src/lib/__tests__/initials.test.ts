import { describe, it, expect } from 'vitest'

import { getInitials } from '../initials'

describe('getInitials', () => {
  describe('from name', () => {
    it('uses the first letter for a single-word name', () => {
      expect(getInitials('Brandon')).toBe('B')
    })

    it('uses first + last initials for a two-word name', () => {
      expect(getInitials('Brandon Fleming')).toBe('BF')
    })

    it('skips middle words and uses first + last for 3+ words', () => {
      expect(getInitials('Maria da Silva')).toBe('MS')
      expect(getInitials('John Ronald Reuel Tolkien')).toBe('JT')
    })

    it('uppercases lowercase input', () => {
      expect(getInitials('brandon fleming')).toBe('BF')
    })

    it('trims surrounding whitespace before extracting', () => {
      expect(getInitials('  Brandon Fleming  ')).toBe('BF')
    })

    it('collapses internal double spaces', () => {
      expect(getInitials('Brandon  Fleming')).toBe('BF')
    })

    it('preserves accented characters', () => {
      expect(getInitials('Émilie Étienne')).toBe('ÉÉ')
    })
  })

  describe('email fallback', () => {
    it('uses the first letter of email when name is empty', () => {
      expect(getInitials('', 'brand@example.com')).toBe('B')
    })

    it('uses the first letter of email when name is whitespace-only', () => {
      expect(getInitials('   ', 'brand@example.com')).toBe('B')
    })

    it('uses the first letter of email when name is null', () => {
      expect(getInitials(null, 'brand@example.com')).toBe('B')
    })

    it('uses the first letter of email when name is undefined', () => {
      expect(getInitials(undefined, 'brand@example.com')).toBe('B')
    })

    it('prefers name over email when both are present', () => {
      expect(getInitials('Brandon', 'someone@else.com')).toBe('B')
    })
  })

  describe('no usable input', () => {
    it('returns "?" when both are missing', () => {
      expect(getInitials()).toBe('?')
    })

    it('returns "?" when both are null', () => {
      expect(getInitials(null, null)).toBe('?')
    })

    it('returns "?" when both are empty strings', () => {
      expect(getInitials('', '')).toBe('?')
    })

    it('returns "?" when both are whitespace', () => {
      expect(getInitials('  ', '  ')).toBe('?')
    })
  })
})
