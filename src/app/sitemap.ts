import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_ORIGIN } from '@/lib/marketing-meta'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // List the URLs of the host being served, with language alternates so Google
  // links the en (mabenn.com) and pt-BR (mabenn.com.br) versions of each page.
  const origin = MARKETING_ORIGIN[marketingLocaleFromHost((await headers()).get('host'))]
  const languages = (path: string) => ({
    languages: {
      en: `${MARKETING_ORIGIN.en}${path}`,
      'pt-BR': `${MARKETING_ORIGIN['pt-BR']}${path}`,
    },
  })
  return [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: languages(''),
    },
    {
      url: `${origin}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: languages('/changelog'),
    },
    {
      url: `${origin}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: languages('/privacidade'),
    },
    {
      url: `${origin}/termos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: languages('/termos'),
    },
  ]
}
