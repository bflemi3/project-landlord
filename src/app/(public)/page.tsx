import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_META } from '@/lib/marketing-meta'
import { Landing } from './landing'

export default async function LandingPage() {
  // Resolve locale from host so the structured data matches the rendered page
  // (mabenn.com → en, mabenn.com.br → pt-BR), same as metadata/OG.
  const host = (await headers()).get('host')
  const locale = marketingLocaleFromHost(host)
  const meta = MARKETING_META[locale]
  const t = await getTranslations({ locale, namespace: 'landing' })

  // FAQ Q/A sourced from the same message files the visible FAQ renders from —
  // single source of truth, so the structured data can't drift.
  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
    { q: t('faqQ8'), a: t('faqA8') },
    { q: t('faqQ9'), a: t('faqA9') },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://mabenn.com/#organization',
        name: 'Mabenn',
        url: 'https://mabenn.com',
        logo: 'https://mabenn.com/icons/icon-512.png',
        slogan: meta.ogTitle,
        description: meta.description,
        areaServed: 'Brazil',
        founder: [
          {
            '@type': 'Person',
            name: 'Brandon Fleming',
            sameAs: 'https://www.linkedin.com/in/brandfleming',
          },
          {
            '@type': 'Person',
            name: 'Lucas de Barros Castro Mota',
            sameAs: 'https://www.linkedin.com/in/lucas-de-barros-castro-mota/',
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Mabenn',
        description: meta.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: 'https://mabenn.com',
        publisher: { '@id': 'https://mabenn.com/#organization' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Landing />
    </>
  )
}
