import type { NextConfig } from 'next'
import { withSerwist } from '@serwist/turbopack'
import createNextIntlPlugin from 'next-intl/plugin'
import fs from 'node:fs'
import { localizedRedirects, localizedRewrites } from './src/lib/i18n/localized-paths'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const appVersion: string = pkg.version

function parseReleaseNotes(version: string): string {
  const changelog = fs.readFileSync('./CHANGELOG.md', 'utf-8')
  const heading = `## v${version}`
  const start = changelog.indexOf(heading)
  if (start === -1) return ''
  const afterHeading = changelog.indexOf('\n', start) + 1
  const nextSection = changelog.indexOf('\n## ', afterHeading)
  const section =
    nextSection === -1
      ? changelog.slice(afterHeading)
      : changelog.slice(afterHeading, nextSection)
  return section.trim()
}

const releaseNotes = parseReleaseNotes(appVersion)

const nextConfig: NextConfig = {
  devIndicators: false,
  // The legal pages read markdown at request time with a dynamic `${locale}` path,
  // which file tracing can't follow — include it so the content ships to prod.
  outputFileTracingIncludes: {
    '/privacy': ['./src/content/legal/privacy/**/*'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_RELEASE_NOTES: releaseNotes,
  },
  async rewrites() {
    const rewrites = localizedRewrites()
    if (process.env.NODE_ENV === 'production') {
      return [...rewrites, { source: '/preview/:path*', destination: '/404' }]
    }
    return rewrites
  },
  async redirects() {
    return localizedRedirects()
  },
}

export default withSerwist(withNextIntl(nextConfig))
