import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_META, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { localizedPath } from '@/lib/i18n/localized-paths'
import { Landing } from './landing'

export default async function LandingPage() {
  // Resolve locale from host so the structured data matches the rendered page
  // (mabenn.com → en, mabenn.com.br → pt-BR), same as metadata/OG.
  const host = (await headers()).get('host')
  const locale = marketingLocaleFromHost(host)
  const meta = MARKETING_META[locale]
  const origin = MARKETING_ORIGIN[locale]
  const orgId = `${origin}/#organization`
  const privacyHref = localizedPath(locale, 'privacy')
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
    { q: t('faqQ10'), a: t('faqA10') },
    { q: t('faqQ11'), a: t('faqA11') },
    { q: t('faqQ12'), a: t('faqA12') },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'Mabenn',
        url: origin,
        logo: `${origin}/icons/icon-512.png`,
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
        url: origin,
        publisher: { '@id': orgId },
        // List price: R$ 49/month per rental (first rental free). Founding-member
        // discount is intentionally not encoded — this is the standard offer.
        offers: {
          '@type': 'Offer',
          price: '49',
          priceCurrency: 'BRL',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '49',
            priceCurrency: 'BRL',
            unitCode: 'MON',
            referenceQuantity: {
              '@type': 'QuantitativeValue',
              value: '1',
              unitText: 'rental',
            },
          },
        },
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
      <Landing privacyHref={privacyHref} />
    </>
  )
}
