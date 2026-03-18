'use client'

import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { type Locale, locales } from '@/i18n/routing'

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  'pt-BR': 'PT-BR',
  es: 'ES',
}

export function LanguageSwitcher() {
  const currentLocale = useLocale()

  function handleChange(locale: Locale) {
    if (locale === currentLocale) return
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    window.location.reload()
  }

  return (
    <div className="inline-flex items-center gap-3 text-xs text-muted-foreground/60">
      {locales.map((locale, i) => (
        <span key={locale} className="inline-flex items-center gap-3">
          {i > 0 && <span>·</span>}
          <button
            onClick={() => handleChange(locale)}
            className={cn(
              'transition-colors hover:text-muted-foreground',
              currentLocale === locale && 'font-medium text-muted-foreground',
            )}
          >
            {localeLabels[locale]}
          </button>
        </span>
      ))}
    </div>
  )
}
