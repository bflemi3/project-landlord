import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Hr,
  pixelBasedPreset,
} from '@react-email/components'
import { Tailwind } from '@react-email/tailwind'
import { type EmailLocale, getEmailTranslations } from '../i18n'

interface EmailLayoutProps {
  preview: string
  locale?: EmailLocale
  header?: React.ReactNode
  children: React.ReactNode
}

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        foreground: '#18181b',
        card: '#ffffff',
        'card-border': '#e4e4e7',
        primary: '#14b8a6',
        'muted-foreground': '#71717a',
        'secondary-foreground': '#52525b',
        muted: '#a1a1aa',
        secondary: '#f4f4f5',
      },
    },
  },
}

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

const localeToLang: Record<EmailLocale, string> = {
  en: 'en',
  'pt-BR': 'pt-BR',
  es: 'es',
}

export function EmailLayout({ preview, locale = 'en', header, children }: EmailLayoutProps) {
  const t = getEmailTranslations(locale)

  return (
    <Html lang={localeToLang[locale]}>
      <Head>
        <meta content="light only" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-120 px-6">
            <Section className="text-center mb-8">
              <Img
                src={`${BASE_URL}/brand/wordmark-light.png`}
                alt="mabenn"
                height="28"
                className="mx-auto my-0"
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '24px', color: '#18181b' }}
              />
            </Section>
            <Section className="bg-card rounded-2xl border border-solid border-card-border overflow-hidden">
              {header}
              <Section className="p-8">
                {children}
              </Section>
            </Section>
            <Hr className="mx-0 my-8 w-full border border-solid border-card-border" />
            <Section className="text-center">
              <Text className="text-sm text-muted m-0">
                {t.footer}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
