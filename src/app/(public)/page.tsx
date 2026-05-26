import { Landing } from './landing'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://mabenn.com/#organization',
      name: 'Mabenn',
      url: 'https://mabenn.com',
      logo: 'https://mabenn.com/icons/icon-512.png',
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
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: 'https://mabenn.com',
      publisher: { '@id': 'https://mabenn.com/#organization' },
    },
  ],
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
