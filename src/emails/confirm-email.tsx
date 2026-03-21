import { Text } from '@react-email/components'
import { EmailLayout } from './components/layout'
import { EmailButton } from './components/email-button'
import { type EmailLocale, getEmailTranslations } from './i18n'

interface ConfirmEmailProps {
  confirmUrl: string
  name?: string
  locale?: EmailLocale
}

export function ConfirmEmail({ confirmUrl, name, locale = 'en' }: ConfirmEmailProps) {
  const t = getEmailTranslations(locale).confirmEmail

  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Text className="text-2xl font-bold text-foreground m-0 mb-4">
        {t.heading}
      </Text>
      <Text className="text-base leading-6 text-secondary-foreground m-0 mb-6">
        {name ? t.bodyWithName(name) : t.body}
      </Text>
      <EmailButton href={confirmUrl}>{t.button}</EmailButton>
      <Text className="text-sm text-muted mt-2 mb-0">
        {t.hint}
      </Text>
    </EmailLayout>
  )
}

export default ConfirmEmail
