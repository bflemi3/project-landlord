import { describe, it, expect } from 'vitest'
import { isValidCnpj } from '../validate'

describe('isValidCnpj', () => {
  describe('valid CNPJs', () => {
    it('validates Enliv CNPJ', () => {
      expect(isValidCnpj('49449868000162')).toBe(true)
    })

    it('validates Petrobras CNPJ', () => {
      expect(isValidCnpj('33000167000101')).toBe(true)
    })

    it('validates Sunclub condo CNPJ', () => {
      expect(isValidCnpj('48581571000193')).toBe(true)
    })

    it('accepts formatted input', () => {
      expect(isValidCnpj('49.449.868/0001-62')).toBe(true)
    })

    it('accepts formatted Sunclub CNPJ', () => {
      expect(isValidCnpj('48.581.571/0001-93')).toBe(true)
    })
  })

  describe('invalid CNPJs', () => {
    it('rejects boleto barcode fragment', () => {
      expect(isValidCnpj('14120000098598')).toBe(false)
    })

    it('rejects wrong check digits', () => {
      // Changed last digit from 2 to 3
      expect(isValidCnpj('49449868000163')).toBe(false)
    })

    it('rejects wrong first check digit', () => {
      // Changed second-to-last digit from 6 to 7
      expect(isValidCnpj('49449868000172')).toBe(false)
    })

    it('rejects all-zeros', () => {
      expect(isValidCnpj('00000000000000')).toBe(false)
    })

    it('rejects all-ones', () => {
      expect(isValidCnpj('11111111111111')).toBe(false)
    })

    it('rejects all-nines', () => {
      expect(isValidCnpj('99999999999999')).toBe(false)
    })
  })

  describe('malformed input', () => {
    it('rejects too short', () => {
      expect(isValidCnpj('4944986800016')).toBe(false)
    })

    it('rejects too long', () => {
      expect(isValidCnpj('494498680001620')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidCnpj('')).toBe(false)
    })

    it('rejects non-numeric characters', () => {
      expect(isValidCnpj('4944986800016a')).toBe(false)
    })

    it('rejects letters mixed in', () => {
      expect(isValidCnpj('AB.CDE.FGH/IJKL-MN')).toBe(false)
    })
  })
})
