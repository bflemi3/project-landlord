import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { marketingLocaleFromHost, MARKETING_META, MARKETING_ORIGIN } from '@/lib/marketing-meta'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { SerwistProvider } from '@/components/serwist-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  display: 'swap',
})

// Metadata is resolved per request from the host, not the NEXT_LOCALE cookie:
// social crawlers send no cookie, so the host is the only locale signal they
// carry (mabenn.com → en, mabenn.com.br → pt-BR). OG/Twitter images are supplied
// by src/app/(public)/opengraph-image.tsx + twitter-image.tsx (also host-aware).
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host')
  const locale = marketingLocaleFromHost(host)
  const meta = MARKETING_META[locale]
  const origin = MARKETING_ORIGIN[locale]

  return {
    title: {
      default: meta.title,
      template: '%s | Mabenn',
    },
    description: meta.description,
    // Per-host so the file-convention OG image (and other relative metadata URLs)
    // resolve to the SAME origin the crawler is on — otherwise a mabenn.com.br page
    // would advertise an og:image on mabenn.com, which renders the en card.
    metadataBase: new URL(origin),
    alternates: {
      canonical: origin,
      languages: {
        en: MARKETING_ORIGIN.en,
        'pt-BR': MARKETING_ORIGIN['pt-BR'],
        'x-default': MARKETING_ORIGIN.en,
      },
    },
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: meta.ogLocale,
      alternateLocale: locale === 'pt-BR' ? ['en_US'] : ['pt_BR'],
      siteName: 'Mabenn',
      title: meta.ogTitle,
      description: meta.description,
      url: origin,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle,
      description: meta.description,
    },
    applicationName: 'mabenn',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'mabenn',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <QueryProvider>
              <TooltipProvider>
                <SerwistProvider>
                  {children}
                </SerwistProvider>
                <Toaster />
              </TooltipProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
