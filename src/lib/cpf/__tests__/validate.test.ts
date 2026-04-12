import { describe, it, expect } from 'vitest'
import { isValidCpf } from '../validate'

describe('isValidCpf', () => {
  describe('valid CPFs', () => {
    it('validates Alex CPF (unformatted)', () => {
      expect(isValidCpf('04003232909')).toBe(true)
    })

    it('validates Alex CPF (formatted)', () => {
      expect(isValidCpf('040.032.329-09')).toBe(true)
    })

    it('validates another known CPF', () => {
      // Generated valid CPF for testing
      expect(isValidCpf('52998224725')).toBe(true)
    })

    it('validates CPF with check digit 0', () => {
      expect(isValidCpf('01000000109')).toBe(true)
    })
  })

  describe('invalid CPFs', () => {
    it('rejects wrong last check digit', () => {
      // Changed last digit from 9 to 8
      expect(isValidCpf('04003232908')).toBe(false)
    })

    it('rejects wrong first check digit', () => {
      // Changed second-to-last digit from 0 to 1
      expect(isValidCpf('04003232919')).toBe(false)
    })

    it('rejects random 11-digit number', () => {
      expect(isValidCpf('12345678901')).toBe(false)
    })

    it('rejects all-zeros', () => {
      expect(isValidCpf('00000000000')).toBe(false)
    })

    it('rejects all-ones', () => {
      expect(isValidCpf('11111111111')).toBe(false)
    })

    it('rejects all-twos', () => {
      expect(isValidCpf('22222222222')).toBe(false)
    })

    it('rejects all-threes', () => {
      expect(isValidCpf('33333333333')).toBe(false)
    })

    it('rejects all-nines', () => {
      expect(isValidCpf('99999999999')).toBe(false)
    })

    it('rejects formatted all-same-digits', () => {
      expect(isValidCpf('000.000.000-00')).toBe(false)
    })
  })

  describe('malformed input', () => {
    it('rejects too short', () => {
      expect(isValidCpf('0400323290')).toBe(false)
    })

    it('rejects too long', () => {
      expect(isValidCpf('040032329090')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidCpf('')).toBe(false)
    })

    it('rejects non-numeric characters', () => {
      expect(isValidCpf('0400323290a')).toBe(false)
    })

    it('rejects letters with formatting', () => {
      expect(isValidCpf('ABC.DEF.GHI-JK')).toBe(false)
    })

    it('rejects CNPJ-length input', () => {
      expect(isValidCpf('49449868000162')).toBe(false)
    })
  })
})
