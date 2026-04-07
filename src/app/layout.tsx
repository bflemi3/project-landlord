import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { SerwistProvider } from '@/components/serwist-provider'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'mabenn — Shared billing for landlords and tenants',
    template: '%s | mabenn',
  },
  description:
    'Replace spreadsheets and email threads with a shared billing workspace everyone can trust. Clear statements, transparent charges, less friction.',
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
    title: 'mabenn — Shared billing for landlords and tenants',
    description:
      'Replace spreadsheets and email threads with a shared billing workspace everyone can trust.',
    url: 'https://mabenn.com',
    images: [{ url: '/og-image', width: 1200, height: 630, alt: 'mabenn — Shared billing you can trust' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'mabenn — Shared billing for landlords and tenants',
    description:
      'Replace spreadsheets and email threads with a shared billing workspace everyone can trust.',
    images: ['/og-image'],
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
    <html lang={locale} className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
