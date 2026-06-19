import { Text, Section } from '@react-email/components'
import { EmailLayout } from './components/layout'
import { EmailButton } from './components/email-button'
import { type EmailLocale, type InviteSource, getEmailTranslations } from './i18n'

export type { InviteSource } from './i18n'

interface InviteCodeProps {
  code: string
  signUpUrl: string
  source?: InviteSource
  locale?: EmailLocale
}

export function InviteCode({ code, signUpUrl, source = 'direct', locale = 'en' }: InviteCodeProps) {
  const t = getEmailTranslations(locale).inviteCode
  const variant = t[source]

  return (
    <EmailLayout preview={variant.preview} locale={locale}>
      <Text className="text-foreground m-0 mb-4 text-2xl font-bold">{variant.heading}</Text>
      <Text className="text-secondary-foreground m-0 mb-6 text-base leading-6">{variant.body}</Text>
      <Section className="bg-secondary mb-2 rounded-xl p-4 text-center">
        <Text className="text-foreground m-0 font-mono text-[28px] font-bold tracking-[4px]">
          {code}
        </Text>
      </Section>
      <EmailButton href={signUpUrl}>{t.button}</EmailButton>
      <Text className="text-muted mt-2 mb-0 text-sm">{t.hint}</Text>
    </EmailLayout>
  )
}

export default InviteCode
