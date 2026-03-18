import { type Locale } from '@/i18n/routing'

/**
 * Map our app locales to Intl locale strings.
 */
const intlLocaleMap: Record<Locale, string> = {
  en: 'en-US',
  'pt-BR': 'pt-BR',
  es: 'es-AR',
}

/**
 * Format a money amount from minor units (integer cents) to a locale-aware string.
 *
 * Examples:
 *   formatCurrency(260000, 'BRL', 'pt-BR') → "R$ 2.600,00"
 *   formatCurrency(260000, 'BRL', 'en')    → "R$2,600.00"
 *   formatCurrency(150099, 'BRL', 'es')    → "R$ 2.600,00" (es-AR style)
 */
export function formatCurrency(
  amountMinor: number,
  currency: string,
  locale: Locale,
): string {
  const amount = amountMinor / 100
  const intlLocale = intlLocaleMap[locale]

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date to a locale-aware short string.
 *
 * Examples:
 *   formatDate(date, 'pt-BR') → "18/03/2026"
 *   formatDate(date, 'en')    → "03/18/2026"
 *   formatDate(date, 'es')    → "18/03/2026"
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const intlLocale = intlLocaleMap[locale]

  return new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(d)
}

/**
 * Format a date to a locale-aware long string.
 *
 * Examples:
 *   formatDateLong(date, 'pt-BR') → "18 de março de 2026"
 *   formatDateLong(date, 'en')    → "March 18, 2026"
 *   formatDateLong(date, 'es')    → "18 de marzo de 2026"
 */
export function formatDateLong(
  date: Date | string,
  locale: Locale,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const intlLocale = intlLocaleMap[locale]

  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
