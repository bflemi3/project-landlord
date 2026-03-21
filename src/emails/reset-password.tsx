import { Text } from '@react-email/components'
import { EmailLayout } from './components/layout'
import { EmailButton } from './components/email-button'
import { type EmailLocale, getEmailTranslations } from './i18n'

interface ResetPasswordProps {
  resetUrl: string
  locale?: EmailLocale
}

export function ResetPassword({ resetUrl, locale = 'en' }: ResetPasswordProps) {
  const t = getEmailTranslations(locale).resetPassword

  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Text className="text-2xl font-bold text-foreground m-0 mb-4">
        {t.heading}
      </Text>
      <Text className="text-base leading-6 text-secondary-foreground m-0 mb-6">
        {t.body}
      </Text>
      <EmailButton href={resetUrl}>{t.button}</EmailButton>
      <Text className="text-sm text-muted mt-2 mb-0">
        {t.hint}
      </Text>
    </EmailLayout>
  )
}

export default ResetPassword
