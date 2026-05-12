import { describe, it, expect } from 'vitest'

import {
  detectTaxIdKindBR,
  formatTaxIdBR,
  isValidTaxIdBR,
} from '../br'

describe('formatTaxIdBR', () => {
  it('returns empty string for empty input', () => {
    expect(formatTaxIdBR('')).toBe('')
  })

  it('formats as CPF when 11 or fewer digits', () => {
    expect(formatTaxIdBR('04003232909')).toBe('040.032.329-09')
    expect(formatTaxIdBR('0400323')).toBe('040.032.3')
  })

  it('formats as CNPJ when 12 or more digits', () => {
    expect(formatTaxIdBR('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatTaxIdBR('112223334445')).toBe('11.222.333/4445')
  })

  it('switches from CPF to CNPJ mask at the 12-digit threshold', () => {
    // 11 digits → CPF mask
    expect(formatTaxIdBR('11222333444')).toBe('112.223.334-44')
    // 12 digits → CNPJ mask
    expect(formatTaxIdBR('112223334445')).toBe('11.222.333/4445')
  })

  it('is idempotent on already-formatted CPF', () => {
    expect(formatTaxIdBR('040.032.329-09')).toBe('040.032.329-09')
  })

  it('is idempotent on already-formatted CNPJ', () => {
    expect(formatTaxIdBR('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })

  it('truncates beyond 14 digits to a CNPJ', () => {
    expect(formatTaxIdBR('11222333000181999')).toBe('11.222.333/0001-81')
  })
})

describe('isValidTaxIdBR', () => {
  it('accepts a valid CPF', () => {
    expect(isValidTaxIdBR('040.032.329-09')).toBe(true)
    expect(isValidTaxIdBR('04003232909')).toBe(true)
  })

  it('accepts a valid CNPJ', () => {
    expect(isValidTaxIdBR('11.222.333/0001-81')).toBe(true)
    expect(isValidTaxIdBR('11222333000181')).toBe(true)
  })

  it('rejects an invalid CPF', () => {
    expect(isValidTaxIdBR('11111111111')).toBe(false)
  })

  it('rejects an invalid CNPJ', () => {
    expect(isValidTaxIdBR('11.222.333/0001-71')).toBe(false)
  })

  it('rejects a 12-digit string (neither CPF nor CNPJ)', () => {
    expect(isValidTaxIdBR('123456789012')).toBe(false)
  })

  it('rejects a 13-digit string (between CPF and CNPJ length)', () => {
    expect(isValidTaxIdBR('1234567890123')).toBe(false)
  })

  it('rejects a 15-digit string (longer than CNPJ)', () => {
    expect(isValidTaxIdBR('123456789012345')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidTaxIdBR('')).toBe(false)
  })
})

describe('detectTaxIdKindBR', () => {
  it('returns "unknown" for empty input', () => {
    expect(detectTaxIdKindBR('')).toBe('unknown')
  })

  it('returns "cpf" for 1-11 digit input', () => {
    expect(detectTaxIdKindBR('1')).toBe('cpf')
    expect(detectTaxIdKindBR('040.032.329-09')).toBe('cpf')
    expect(detectTaxIdKindBR('04003232909')).toBe('cpf')
  })

  it('returns "cnpj" for 12+ digit input', () => {
    expect(detectTaxIdKindBR('123456789012')).toBe('cnpj')
    expect(detectTaxIdKindBR('11.222.333/0001-81')).toBe('cnpj')
    expect(detectTaxIdKindBR('11222333000181')).toBe('cnpj')
  })

  it('counts digits not raw length', () => {
    // 11 digits + 3 punctuation = "cpf"
    expect(detectTaxIdKindBR('040.032.329-09')).toBe('cpf')
  })

  it('counts digits across mixed punctuation at the 11/12 threshold', () => {
    // 11 digits across mixed punctuation → still "cpf"
    expect(detectTaxIdKindBR('11.222.333/000')).toBe('cpf')
    // 12 digits across mixed punctuation → "cnpj"
    expect(detectTaxIdKindBR('11.222.333/0001')).toBe('cnpj')
  })
})
