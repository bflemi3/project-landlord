import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { marketingLocaleFromHost, MARKETING_ORIGIN } from '@/lib/marketing-meta'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Point crawlers at the sitemap on the same domain they're requesting from.
  const origin = MARKETING_ORIGIN[marketingLocaleFromHost((await headers()).get('host'))]
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/auth/', '/~offline', '/serwist/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
