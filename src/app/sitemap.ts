import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { localizedPath } from '@/lib/i18n/localized-paths'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // List the URLs of the host being served, with language alternates so Google
  // links the en (mabenn.com) and pt-BR (mabenn.com.br) versions of each page.
  const locale = marketingLocaleFromHost((await headers()).get('host'))
  const origin = MARKETING_ORIGIN[locale]
  const symmetricLanguages = (path: string) => ({
    languages: {
      en: `${MARKETING_ORIGIN.en}${path}`,
      'pt-BR': `${MARKETING_ORIGIN['pt-BR']}${path}`,
    },
  })
  // ES is intentionally excluded from hreflang/sitemap: there's no public ES URL
  // (no /es prefix, no ES domain), so we don't claim ES coverage to crawlers.
  // ES users still get Spanish content in-product via the NEXT_LOCALE cookie.
  const legalLanguages = (doc: 'privacy') => ({
    languages: {
      en: `${MARKETING_ORIGIN.en}${localizedPath('en', doc)}`,
      'pt-BR': `${MARKETING_ORIGIN['pt-BR']}${localizedPath('pt-BR', doc)}`,
    },
  })
  return [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: symmetricLanguages(''),
    },
    {
      url: `${origin}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: symmetricLanguages('/changelog'),
    },
    {
      url: `${origin}${localizedPath(locale, 'privacy')}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: legalLanguages('privacy'),
    },
  ]
}
