import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import createNextIntlPlugin from 'next-intl/plugin'
import crypto from 'node:crypto'
import fs from 'node:fs'

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

const revision = crypto.randomUUID()

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
})

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_RELEASE_NOTES: releaseNotes,
  },
}

export default withSerwist(withNextIntl(nextConfig))
