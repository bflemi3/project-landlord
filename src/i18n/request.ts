import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { locales, type Locale } from './routing'
import { marketingLocaleFromHost } from '@/lib/marketing-meta'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined

  // The cookie is the user's explicit choice (set by the language switcher) and wins.
  // Otherwise the domain decides — mabenn.com → en, mabenn.com.br → pt-BR — so a
  // cookieless first visit or crawler renders the same locale the metadata advertises.
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : marketingLocaleFromHost((await headers()).get('host'))

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
