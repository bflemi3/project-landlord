import { Text, Section, Hr } from '@react-email/components'
import { EmailLayout } from './components/layout'
import { type EmailLocale, getEmailTranslations } from './i18n'

interface WaitlistWelcomeProps {
  email: string
  locale?: EmailLocale
}

export function WaitlistWelcome({ email, locale = 'en' }: WaitlistWelcomeProps) {
  const t = getEmailTranslations(locale).waitlistWelcome

  const headerContent = (
    <Section className="bg-primary p-8">
      <Text className="text-2xl font-bold text-white m-0">
        {t.heading}
      </Text>
      <Text className="text-base text-white m-0 mt-2" style={{ opacity: 0.85 }}>
        {t.body}
      </Text>
    </Section>
  )

  return (
    <EmailLayout
      preview={t.preview}
      locale={locale}
      header={headerContent}
    >
      <Text className="text-sm font-semibold text-foreground m-0 mb-4">
        {t.whatsComingTitle}
      </Text>
      <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
        {[t.benefit1, t.benefit2, t.benefit3].map((benefit, i) => (
          <tr key={i}>
            <td style={{ paddingBottom: i < 2 ? '12px' : '0' }}>
              <table cellPadding={0} cellSpacing={0} border={0}>
                <tr>
                  <td style={{ verticalAlign: 'top', paddingRight: '12px' }}>
                    <Text className="text-primary text-base font-bold m-0">✓</Text>
                  </td>
                  <td>
                    <Text className="text-sm text-secondary-foreground m-0">
                      {benefit}
                    </Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        ))}
      </table>
      <Hr className="border-card-border my-6" />
      <Text className="text-sm text-muted m-0">
        {t.closingLine}
      </Text>
      <Text className="text-base text-muted-foreground mt-4 mb-0">
        {t.signoff}
      </Text>
    </EmailLayout>
  )
}

export default WaitlistWelcome
