import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { locales, type Locale, defaultLocale } from '@/i18n/routing'
import { marketingLocaleFromHost, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { BackButton } from '@/components/back-button'
import { MarkdownDocument, MarkdownDocumentContent } from '@/components/markdown-document'

function readPolicy(locale: Locale): string {
  const dir = path.join(process.cwd(), 'src/content/legal/privacy')
  const candidate = path.join(dir, `${locale}.md`)
  const filePath = fs.existsSync(candidate) ? candidate : path.join(dir, `${defaultLocale}.md`)
  return fs.readFileSync(filePath, 'utf-8')
}

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host')
  const origin = MARKETING_ORIGIN[marketingLocaleFromHost(host)]
  const t = await getTranslations('legal.privacy')
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${origin}/privacidade`,
      languages: {
        en: `${MARKETING_ORIGIN.en}/privacidade`,
        'pt-BR': `${MARKETING_ORIGIN['pt-BR']}/privacidade`,
        'x-default': `${MARKETING_ORIGIN.en}/privacidade`,
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
