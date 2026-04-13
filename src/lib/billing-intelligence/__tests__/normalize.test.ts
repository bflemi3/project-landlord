import { describe, it, expect } from 'vitest'
import {
  normalizeDate,
  normalizeMonth,
  normalizeBarcode,
  parseBRL,
  toMinorUnits,
} from '../normalize'

describe('normalizeDate', () => {
  it('normalizes BR format DD/MM/YYYY', () => {
    expect(normalizeDate('24/04/2026')).toBe('2026-04-24')
  })

  it('normalizes ISO with time', () => {
    expect(normalizeDate('2026-04-24T19:33:21.923Z')).toBe('2026-04-24')
  })

  it('passes through YYYY-MM-DD', () => {
    expect(normalizeDate('2026-04-24')).toBe('2026-04-24')
  })

  it('passes through unrecognized formats unchanged', () => {
    expect(normalizeDate('April 24, 2026')).toBe('April 24, 2026')
  })
})

describe('normalizeMonth', () => {
  it('normalizes MAR/2026 to YYYY-MM', () => {
    expect(normalizeMonth('MAR/2026')).toBe('2026-03')
  })

  it('normalizes ABR/2026', () => {
    expect(normalizeMonth('ABR/2026')).toBe('2026-04')
  })

  it('normalizes JAN/2026', () => {
    expect(normalizeMonth('JAN/2026')).toBe('2026-01')
  })

  it('normalizes DEZ/2026', () => {
    expect(normalizeMonth('DEZ/2026')).toBe('2026-12')
  })

  it('passes through YYYY-MM', () => {
    expect(normalizeMonth('2026-03')).toBe('2026-03')
  })

  // English
  it('normalizes FEB/2026 (English)', () => {
    expect(normalizeMonth('FEB/2026')).toBe('2026-02')
  })

  it('normalizes APR/2026 (English)', () => {
    expect(normalizeMonth('APR/2026')).toBe('2026-04')
  })

  it('normalizes SEP/2026 (English)', () => {
    expect(normalizeMonth('SEP/2026')).toBe('2026-09')
  })

  it('normalizes DEC/2026 (English)', () => {
    expect(normalizeMonth('DEC/2026')).toBe('2026-12')
  })

  // Spanish
  it('normalizes ENE/2026 (Spanish)', () => {
    expect(normalizeMonth('ENE/2026')).toBe('2026-01')
  })

  it('normalizes DIC/2026 (Spanish)', () => {
    expect(normalizeMonth('DIC/2026')).toBe('2026-12')
  })

  // Shared across languages
  it('normalizes JAN/2026 (shared PT/EN)', () => {
    expect(normalizeMonth('JAN/2026')).toBe('2026-01')
  })

  it('normalizes MAR/2026 (shared PT/EN/ES)', () => {
    expect(normalizeMonth('MAR/2026')).toBe('2026-03')
  })

  // Case insensitivity
  it('normalizes lowercase mar/2026', () => {
    expect(normalizeMonth('mar/2026')).toBe('2026-03')
  })

  it('normalizes mixed case Abr/2026', () => {
    expect(normalizeMonth('Abr/2026')).toBe('2026-04')
  })

  it('passes through unrecognized formats unchanged', () => {
    expect(normalizeMonth('March 2026')).toBe('March 2026')
  })
})

describe('normalizeBarcode', () => {
  it('strips spaces, dots, and dashes', () => {
    expect(normalizeBarcode('74891.16009 06660.307304 32263.871033 5 14260000021847'))
      .toBe('74891160090666030730432263871033514260000021847')
  })

  it('handles already-clean barcode', () => {
    expect(normalizeBarcode('74891160090666030730432263871033514260000021847'))
      .toBe('74891160090666030730432263871033514260000021847')
  })

  it('handles empty string', () => {
    expect(normalizeBarcode('')).toBe('')
  })
})

describe('parseBRL', () => {
  it('parses simple amount', () => {
    expect(parseBRL('218,47')).toBe(218.47)
  })

  it('parses amount with thousands separator', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56)
  })

  it('parses zero', () => {
    expect(parseBRL('0,00')).toBe(0)
  })

  it('parses large amounts', () => {
    expect(parseBRL('12.345.678,90')).toBe(12345678.90)
  })

  it('throws on empty string', () => {
    expect(() => parseBRL('')).toThrow('parseBRL: invalid input')
  })

  it('throws on non-numeric input', () => {
    expect(() => parseBRL('abc')).toThrow('parseBRL: invalid input')
  })
})

describe('toMinorUnits', () => {
  it('converts BRL to centavos', () => {
    expect(toMinorUnits(218.47)).toBe(21847)
  })

  it('handles round numbers', () => {
    expect(toMinorUnits(100)).toBe(10000)
  })

  it('rounds floating point correctly', () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30)
  })
})
