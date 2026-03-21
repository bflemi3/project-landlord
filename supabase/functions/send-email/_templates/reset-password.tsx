import { Text, Button, Section } from '@react-email/components'
import { EmailLayout } from './layout.tsx'
import { type EmailLocale, getAuthEmailTranslations } from '../i18n.ts'

interface ResetPasswordProps {
  resetUrl: string
  locale?: EmailLocale
  baseUrl: string
}

export function ResetPassword({ resetUrl, locale = 'en', baseUrl }: ResetPasswordProps) {
  const t = getAuthEmailTranslations(locale).resetPassword

  return (
    <EmailLayout preview={t.preview} locale={locale} baseUrl={baseUrl}>
      <Text className="text-2xl font-bold text-foreground m-0 mb-4">
        {t.heading}
      </Text>
      <Text className="text-base leading-6 text-secondary-foreground m-0 mb-6">
        {t.body}
      </Text>
      <Section className="py-2 px-0">
        <Button
          className="bg-primary rounded-xl font-bold text-white text-base no-underline text-center block py-3 px-6"
          href={resetUrl}
        >
          {t.button}
        </Button>
      </Section>
      <Text className="text-sm text-muted mt-2 mb-0">
        {t.hint}
      </Text>
    </EmailLayout>
  )
}

export default ResetPassword
