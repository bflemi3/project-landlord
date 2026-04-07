import { Landing } from './landing'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'mabenn',
  applicationCategory: 'FinanceApplication',
  description: 'Shared billing workspace for landlords and tenants. Replace spreadsheets and email threads with clear statements everyone can trust.',
  url: 'https://mabenn.com',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
  },
}

export default function LandingPage() {
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
