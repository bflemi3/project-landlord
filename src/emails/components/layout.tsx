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
        highlight: '#e9408f',
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
        {/* Keep text-size-adjust pinned for WebKit/iOS; everything else is the
            stock react-email structure. The real fix is the px max-width below —
            a rem max-width (from the non-standard max-w-120) made Gmail mobile
            fall back to its own zoom/boost. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content="light only" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
        <style>{`
          *{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;text-size-adjust:100%}
          @media only screen and (max-width:480px){
            .em-pad-container{padding-left:8px!important;padding-right:8px!important}
            .em-pad-section{padding-left:16px!important;padding-right:16px!important}
          }
        `}</style>
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{preview}</Preview>
          {/* Stops the Gmail Android app from inflating body text. Gmail bumps font
              size unless that would push a text element past the viewport — so this
              hidden, full-width nowrap line makes the bump "overflow" and Gmail leaves
              sizes alone. Gmail ignores display:none, hence the bg-matched white color.
              See emailonacid.com / css-tricks.com (override-gmail-mobile-optimized). */}
          <div style={{ display: 'none', whiteSpace: 'nowrap', font: '15px courier', color: '#ffffff' }}>
            {' — '.repeat(60)}
          </div>
          <Container className="em-pad-container mx-auto my-10 max-w-[480px] px-6">
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
              <Section className="em-pad-section p-8">
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
