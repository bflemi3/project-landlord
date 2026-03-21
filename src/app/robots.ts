import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/auth/', '/~offline', '/serwist/', '/og-image'],
    },
    sitemap: 'https://mabenn.com/sitemap.xml',
  }
}
