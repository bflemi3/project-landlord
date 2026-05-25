import type { Metadata } from 'next'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
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

export const metadata: Metadata = {
  title: {
    default: 'mabenn | Rental management for Brazilian landlords',
    template: '%s | mabenn',
  },
  description:
    'Rent tracking, contracts, and payment visibility for Brazilian landlords — everything a property manager does, without the 8–12% fee.',
  metadataBase: new URL('https://mabenn.com'),
  alternates: {
    canonical: '/',
    languages: {
      en: 'https://mabenn.com',
      'pt-BR': 'https://mabenn.com.br',
      es: 'https://mabenn.com',
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
    locale: 'en_US',
    alternateLocale: ['pt_BR', 'es_AR'],
    siteName: 'mabenn',
    title: 'Everything a property manager does. None of the fee.',
    description:
      'Rental management for Brazilian landlords — rent tracking, contracts, payment visibility. Without paying 8–12% in management fees.',
    url: 'https://mabenn.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'mabenn — Rental management for Brazilian landlords' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Everything a property manager does. None of the fee.',
    description:
      'Rental management for Brazilian landlords — rent tracking, contracts, payment visibility. Without paying 8–12% in management fees.',
    images: ['/og-image.png'],
  },
  applicationName: 'mabenn',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'mabenn',
  },
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
