// Calendar-date helpers for date pickers. The form layer stores ISO
// YYYY-MM-DD strings; the picker primitive (react-day-picker) speaks JS
// Date. Both helpers stay in LOCAL time so the day component the user sees
// is always the day the slice records — `new Date('2026-01-01')` parses as
// UTC midnight, which renders as 2025-12-31 in São Paulo (UTC-3).

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASHED_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/

// Locales that put the day before the month in their short date format.
// Anything else falls back to month-first (en-style). Add new locales here
// as the i18n routing list grows; the typeable input parses against this set.
const DAY_FIRST_LOCALES = new Set(['pt-BR', 'es'])

function isDayFirstLocale(locale: string): boolean {
  return DAY_FIRST_LOCALES.has(locale)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Builds a calendar-validated Date from year/month/day numbers. Returns
// undefined when the components don't survive the round-trip (e.g., Feb 30
// rolled over to Mar 2) so callers can treat impossible dates as "absent".
function makeCalendarDate(year: number, month: number, day: number): Date | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined
  }
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return date
}

export function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = ISO_DATE.exec(value)
  if (!match) return undefined
  return makeCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

export function formatIsoDate(value: Date | undefined): string | undefined {
  if (!value) return undefined
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

/**
 * Parses a typed date string into ISO YYYY-MM-DD. Accepts:
 *   • ISO YYYY-MM-DD (any locale — paste-friendly canonical form)
 *   • The user locale's short slashed form (en: MM/dd/yyyy, day-first
 *     locales: dd/MM/yyyy)
 * Returns undefined for any other input, including incomplete or
 * calendar-invalid dates (Feb 30, month 13, etc.).
 */
export function parseLocaleDate(input: string, locale: string): string | undefined {
  if (!input) return undefined

  // ISO passthrough. Same calendar guard as parseIsoDate so a typed
  // YYYY-MM-DD can't smuggle in an impossible date.
  const isoMatch = ISO_DATE.exec(input)
  if (isoMatch) {
    const date = makeCalendarDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
    return date ? formatIsoDate(date) : undefined
  }

  // Locale's slashed form: dd/MM/yyyy (day-first) or MM/dd/yyyy (else).
  const slashed = SLASHED_DATE.exec(input)
  if (!slashed) return undefined
  const [, first, second, year] = slashed
  const day = isDayFirstLocale(locale) ? Number(first) : Number(second)
  const month = isDayFirstLocale(locale) ? Number(second) : Number(first)
  const date = makeCalendarDate(Number(year), month, day)
  return date ? formatIsoDate(date) : undefined
}

/**
 * Formats an ISO YYYY-MM-DD as the user locale's short slashed form. Used to
 * display the slice value inside the typeable input — the same string the
 * parser will accept back. Returns '' for undefined or invalid ISO so the
 * input value can be set unconditionally.
 */
export function formatLocaleDate(iso: string | undefined, locale: string): string {
  const date = parseIsoDate(iso)
  if (!date) return ''
  const day = pad2(date.getDate())
  const month = pad2(date.getMonth() + 1)
  const year = date.getFullYear()
  return isDayFirstLocale(locale) ? `${day}/${month}/${year}` : `${month}/${day}/${year}`
}
