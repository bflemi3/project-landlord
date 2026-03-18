import { type Locale, locales, defaultLocale } from '@/i18n/routing'

const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * Maps a raw locale string (from Accept-Language or domain) to a supported locale.
 */
function mapToSupportedLocale(raw: string): Locale | null {
  const lower = raw.toLowerCase().trim()

  // Exact match
  for (const locale of locales) {
    if (lower === locale.toLowerCase()) return locale
  }

  // Language prefix match (e.g., "pt" → "pt-BR", "es-AR" → "es")
  const lang = lower.split('-')[0]
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'es') return 'es'
  if (lang === 'en') return 'en'

  return null
}

/**
 * Detect locale from Accept-Language header.
 * Returns the best matching supported locale, or null if none match.
 */
export function detectLocaleFromHeader(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null

  // Parse Accept-Language: "pt-BR,pt;q=0.9,en;q=0.8"
  const candidates = acceptLanguage
    .split(',')
    .map((part) => {
      const [locale, qPart] = part.trim().split(';')
      const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1
      return { locale: locale.trim(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const { locale } of candidates) {
    const matched = mapToSupportedLocale(locale)
    if (matched) return matched
  }

  return null
}

/**
 * Detect locale from the request hostname.
 * .com.br → pt-BR
 */
export function detectLocaleFromDomain(hostname: string): Locale | null {
  if (hostname.endsWith('.com.br')) return 'pt-BR'
  return null
}

export { LOCALE_COOKIE, defaultLocale }
export type { Locale }
