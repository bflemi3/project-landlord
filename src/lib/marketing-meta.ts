import { detectLocaleFromDomain } from '@/lib/i18n/detect-locale'

// Marketing surfaces are only publicly routed for these two locales.
// ES has no domain/path yet — when it gets one, add it here and to MARKETING_META.
export type MarketingLocale = 'en' | 'pt-BR'

/**
 * Resolve the marketing locale from the request host. Social crawlers send no
 * NEXT_LOCALE cookie, so the host is the only locale signal they carry:
 * mabenn.com → en, mabenn.com.br → pt-BR.
 */
export function marketingLocaleFromHost(host: string | null | undefined): MarketingLocale {
  if (!host) return 'en'
  // Strip any port and lowercase before matching the domain (a proxy can leave a
  // port on the Host header, and casing isn't guaranteed).
  const hostname = host.split(':')[0].toLowerCase()
  return detectLocaleFromDomain(hostname) === 'pt-BR' ? 'pt-BR' : 'en'
}

export const MARKETING_ORIGIN: Record<MarketingLocale, string> = {
  en: 'https://mabenn.com',
  'pt-BR': 'https://mabenn.com.br',
}

type MetaCopy = {
  title: string
  description: string
  ogTitle: string
  ogKicker: string
  ogLocale: 'en_US' | 'pt_BR'
}

// pt-BR strings are AI-drafted and pending native-speaker review
// (see docs/marketing/positioning-and-messaging-foundation.md §14 → Localization).
export const MARKETING_META: Record<MarketingLocale, MetaCopy> = {
  en: {
    title: 'Mabenn | Property management without the property manager',
    description:
      'Rent tracking, contracts, and the lifecycle paperwork for Brazilian landlords — the work a property manager does, without the 8–12% fee.',
    ogTitle: 'Property management without the property manager.',
    ogKicker: 'Take back the 8–12%.',
    ogLocale: 'en_US',
  },
  'pt-BR': {
    title: 'Mabenn | Administração de imóveis sem a imobiliária',
    description:
      'Controle de aluguel, contratos e toda a papelada para locadores brasileiros — o trabalho da imobiliária, sem a taxa de 8–12%.',
    ogTitle: 'Administração de imóveis sem a imobiliária.',
    ogKicker: 'Recupere os 8–12%.',
    ogLocale: 'pt_BR',
  },
}
