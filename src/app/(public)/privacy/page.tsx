import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { locales, type Locale, defaultLocale } from '@/i18n/routing'
import { marketingLocaleFromHost, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { localizedPath } from '@/lib/i18n/localized-paths'
import { BackButton } from '@/components/back-button'
import { MarkdownDocument, MarkdownDocumentContent } from '@/components/markdown-document'

function readPolicy(locale: Locale): string {
  const dir = path.join(process.cwd(), 'src/content/legal/privacy')
  const candidate = path.join(dir, `${locale}.md`)
  if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf-8')
  // Don't silently ship en.md under a non-en canonical when a new locale is
  // added without its markdown — throw in dev so the build catches it; log in
  // prod so users still get a page.
  const msg = `Missing legal/privacy markdown for locale "${locale}", falling back to ${defaultLocale}.`
  if (process.env.NODE_ENV === 'production') console.error(msg)
  else throw new Error(msg)
  return fs.readFileSync(path.join(dir, `${defaultLocale}.md`), 'utf-8')
}

export async function generateMetadata(): Promise<Metadata> {
  // Locale split: title/description follow the user's cookie (via getTranslations'
  // default request-config locale — see src/i18n/request.ts) so a cookie-ES user
  // sees a Spanish tab title that matches the Spanish body. canonical/hreflang
  // stay host-bound — they're crawler-facing SEO hints and crawlers carry no
  // cookie. ES has no public URL, so it's intentionally absent from hreflang.
  const host = (await headers()).get('host')
  const locale = marketingLocaleFromHost(host)
  const origin = MARKETING_ORIGIN[locale]
  const t = await getTranslations('legal.privacy')
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${origin}${localizedPath(locale, 'privacy')}`,
      languages: {
        en: `${MARKETING_ORIGIN.en}${localizedPath('en', 'privacy')}`,
        'pt-BR': `${MARKETING_ORIGIN['pt-BR']}${localizedPath('pt-BR', 'privacy')}`,
        'x-default': `${MARKETING_ORIGIN.en}${localizedPath('en', 'privacy')}`,
      },
    },
  }
}

export default async function PrivacyPolicyPage() {
  const requested = await getLocale()
  const locale: Locale = (locales as readonly string[]).includes(requested)
    ? (requested as Locale)
    : defaultLocale
  return (
    <MarkdownDocument>
      <BackButton />
      <MarkdownDocumentContent>{readPolicy(locale)}</MarkdownDocumentContent>
    </MarkdownDocument>
  )
}
