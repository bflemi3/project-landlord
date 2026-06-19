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
      <Text className="text-foreground m-0 mb-4 text-2xl font-bold">{t.heading}</Text>
      <Text className="text-secondary-foreground m-0 mb-6 text-base leading-6">{t.body}</Text>
      <EmailButton href={resetUrl}>{t.button}</EmailButton>
      <Text className="text-muted mt-2 mb-0 text-sm">{t.hint}</Text>
    </EmailLayout>
  )
}

export default ResetPassword
