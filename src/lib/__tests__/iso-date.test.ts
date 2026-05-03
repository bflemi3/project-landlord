import { describe, expect, it } from 'vitest'

import {
  formatIsoDate,
  formatLocaleDate,
  parseIsoDate,
  parseLocaleDate,
} from '../iso-date'

// parseIsoDate / formatIsoDate exist to keep date pickers timezone-safe. The
// classic bug is `new Date('2026-01-01')` parsing as UTC midnight, which a
// São Paulo (UTC-3) user's picker then renders as 2025-12-31. These helpers
// build the Date in local time and serialize it back from local components,
// so the wire string and the displayed day always agree.

describe('parseIsoDate', () => {
  it('returns undefined for undefined input', () => {
    expect(parseIsoDate(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(parseIsoDate('')).toBeUndefined()
  })

  it('returns undefined for non-ISO format', () => {
    expect(parseIsoDate('01/01/2026')).toBeUndefined()
    expect(parseIsoDate('2026/01/01')).toBeUndefined()
    expect(parseIsoDate('2026-1-1')).toBeUndefined()
  })

  it('parses a valid ISO date into a local-time Date with matching components', () => {
    const d = parseIsoDate('2026-03-15')
    expect(d).toBeInstanceOf(Date)
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(2) // March is 2 (0-indexed)
    expect(d!.getDate()).toBe(15)
  })

  it('does not drift across the UTC midnight boundary in negative-offset zones', () => {
    // Constructing via `new Date('2026-01-01')` yields UTC midnight, which is
    // 2025-12-31 21:00 in São Paulo (UTC-3). parseIsoDate must build the
    // Date from year/month/day directly so the local day matches the input.
    const d = parseIsoDate('2026-01-01')
    expect(d!.getDate()).toBe(1)
    expect(d!.getMonth()).toBe(0)
    expect(d!.getFullYear()).toBe(2026)
  })

  it('rejects impossible day-of-month (Feb 30) instead of silently rolling over', () => {
    // `new Date(2026, 1, 30)` rolls to March 2 — silent corruption that would
    // misrepresent an extraction-emitted bad date as a different real date in
    // the picker. Defense in depth: refuse to construct, return undefined.
    expect(parseIsoDate('2026-02-30')).toBeUndefined()
  })

  it('rejects impossible month (month 13) instead of silently rolling over', () => {
    // `new Date(2026, 12, 1)` rolls to January 2027.
    expect(parseIsoDate('2026-13-01')).toBeUndefined()
  })

  it('accepts Feb 29 in a leap year', () => {
    // 2024 is a leap year — sanity check that the rollover guard isn't too
    // strict and rejecting genuine calendar dates.
    const d = parseIsoDate('2024-02-29')
    expect(d!.getDate()).toBe(29)
    expect(d!.getMonth()).toBe(1)
  })

  it('rejects Feb 29 in a non-leap year', () => {
    // 2026 is not a leap year — `new Date(2026, 1, 29)` rolls to March 1.
    expect(parseIsoDate('2026-02-29')).toBeUndefined()
  })
})

describe('formatIsoDate', () => {
  it('returns undefined for undefined input', () => {
    expect(formatIsoDate(undefined)).toBeUndefined()
  })

  it('formats a Date as YYYY-MM-DD using its local components', () => {
    const d = new Date(2026, 2, 15)
    expect(formatIsoDate(d)).toBe('2026-03-15')
  })

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2026, 0, 5)
    expect(formatIsoDate(d)).toBe('2026-01-05')
  })

  it('round-trips parseIsoDate → formatIsoDate without drift', () => {
    const iso = '2026-07-04'
    expect(formatIsoDate(parseIsoDate(iso))).toBe(iso)
  })
})

// ---------------------------------------------------------------------------
// parseLocaleDate / formatLocaleDate — locale-aware string ↔ ISO. The
// IsoDatePicker's typeable input shows and accepts the locale's short format
// (en: MM/dd/yyyy, pt-BR/es: dd/MM/yyyy). ISO YYYY-MM-DD is also accepted as
// a paste convenience regardless of locale.
// ---------------------------------------------------------------------------

describe('parseLocaleDate', () => {
  describe('en (MM/dd/yyyy)', () => {
    it('parses MM/dd/yyyy as month-first', () => {
      expect(parseLocaleDate('05/02/2026', 'en')).toBe('2026-05-02')
    })

    it('rejects dd/MM/yyyy interpreted as MM/dd/yyyy when month > 12', () => {
      // '13/05/2026' would be interpreted as month=13, which is invalid.
      expect(parseLocaleDate('13/05/2026', 'en')).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
      expect(parseLocaleDate('', 'en')).toBeUndefined()
    })

    it('returns undefined for incomplete input', () => {
      expect(parseLocaleDate('05/02', 'en')).toBeUndefined()
      expect(parseLocaleDate('5/2/26', 'en')).toBeUndefined()
    })

    it('rejects calendar-impossible dates (Feb 30)', () => {
      expect(parseLocaleDate('02/30/2026', 'en')).toBeUndefined()
    })
  })

  describe('pt-BR (dd/MM/yyyy)', () => {
    it('parses dd/MM/yyyy as day-first', () => {
      expect(parseLocaleDate('02/05/2026', 'pt-BR')).toBe('2026-05-02')
    })

    it('rejects MM/dd/yyyy interpreted as dd/MM/yyyy when day > 31', () => {
      expect(parseLocaleDate('32/05/2026', 'pt-BR')).toBeUndefined()
    })

    it('rejects calendar-impossible dates (Feb 30)', () => {
      expect(parseLocaleDate('30/02/2026', 'pt-BR')).toBeUndefined()
    })
  })

  describe('es (dd/MM/yyyy)', () => {
    it('parses dd/MM/yyyy as day-first', () => {
      expect(parseLocaleDate('15/03/2026', 'es')).toBe('2026-03-15')
    })
  })

  describe('ISO passthrough (any locale)', () => {
    it('accepts ISO YYYY-MM-DD in en', () => {
      expect(parseLocaleDate('2026-05-02', 'en')).toBe('2026-05-02')
    })

    it('accepts ISO YYYY-MM-DD in pt-BR', () => {
      expect(parseLocaleDate('2026-05-02', 'pt-BR')).toBe('2026-05-02')
    })

    it('accepts ISO YYYY-MM-DD in es', () => {
      expect(parseLocaleDate('2026-05-02', 'es')).toBe('2026-05-02')
    })

    it('rejects ISO with calendar-invalid date', () => {
      expect(parseLocaleDate('2026-02-30', 'en')).toBeUndefined()
    })
  })
})

describe('formatLocaleDate', () => {
  it('returns empty string for undefined', () => {
    expect(formatLocaleDate(undefined, 'en')).toBe('')
  })

  it('returns empty string for invalid ISO', () => {
    expect(formatLocaleDate('not-a-date', 'en')).toBe('')
  })

  it('formats as MM/dd/yyyy in en', () => {
    expect(formatLocaleDate('2026-05-02', 'en')).toBe('05/02/2026')
  })

  it('formats as dd/MM/yyyy in pt-BR', () => {
    expect(formatLocaleDate('2026-05-02', 'pt-BR')).toBe('02/05/2026')
  })

  it('formats as dd/MM/yyyy in es', () => {
    expect(formatLocaleDate('2026-05-02', 'es')).toBe('02/05/2026')
  })

  it('round-trips formatLocaleDate → parseLocaleDate without drift', () => {
    for (const locale of ['en', 'pt-BR', 'es'] as const) {
      const iso = '2026-07-04'
      expect(parseLocaleDate(formatLocaleDate(iso, locale), locale)).toBe(iso)
    }
  })
})
