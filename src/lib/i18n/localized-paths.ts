// Single source of truth for routes whose URL differs by host/locale. Imported
// by both runtime code (sitemap, footer/FAQ links, page metadata) and the
// `next.config.ts` rewrites/redirects, so the mapping can't drift between them.
// Routes that share the same path on both hosts (e.g. `/changelog`) stay out.

export type MarketingLocale = 'en' | 'pt-BR'

// The `en` value is also the internal app-router folder name. To add a new
// localized route, add an entry here and create the folder at that en path.
export const LOCALIZED_PATHS = {
  privacy: { en: '/privacy', 'pt-BR': '/privacidade' },
  terms: { en: '/terms', 'pt-BR': '/termos' },
} as const satisfies Record<string, Record<MarketingLocale, string>>

export type LocalizedRouteKey = keyof typeof LOCALIZED_PATHS

export function localizedPath(locale: MarketingLocale, key: LocalizedRouteKey): string {
  return LOCALIZED_PATHS[key][locale]
}

// Reverse lookup: given an EN path like `/privacy`, return the pt-BR canonical
// (`/privacidade`). Used by the proxy to translate a path before redirecting a
// PT-BR-preferring visitor from .com to .com.br, so they land at the canonical
// pt-BR URL in a single hop instead of 307 → 308.
const PATH_EN_TO_PT_BR: Record<string, string> = Object.fromEntries(
  Object.values(LOCALIZED_PATHS).map((p) => [p.en, p['pt-BR']]),
)
export function ptBrPathFor(path: string): string {
  return PATH_EN_TO_PT_BR[path] ?? path
}

// Production matches mabenn.com.br; localhost and *.vercel.app are included
// so dev and preview deployments can resolve the PT-BR URLs too. Without
// these, the rewrite (PT-BR URL → EN folder) only fires in prod, and the
// folder rename means /privacidade + /termos 404 on every other host.
const PT_BR_HOST = '(?:www\\.)?mabenn\\.com\\.br|localhost(?::\\d+)?|.*\\.vercel\\.app'

// `next.config.ts` rewrites: on .com.br, serve the EN-named folder when the
// user hits the PT-BR URL. URL bar stays Portuguese; internal route stays
// canonical English.
export function localizedRewrites() {
  return Object.values(LOCALIZED_PATHS).map((p) => ({
    source: p['pt-BR'],
    destination: p.en,
    has: [{ type: 'host' as const, value: PT_BR_HOST }],
  }))
}

// `next.config.ts` redirects: on .com.br, send anyone who reaches the EN URL
// to the PT-BR canonical so each host has one canonical URL.
export function localizedRedirects() {
  return Object.values(LOCALIZED_PATHS).map((p) => ({
    source: p.en,
    destination: p['pt-BR'],
    permanent: true as const,
    has: [{ type: 'host' as const, value: PT_BR_HOST }],
  }))
}
