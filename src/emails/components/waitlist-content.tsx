import { Text, Section, Hr } from '@react-email/components'
import { EmailLayout } from './layout'
import { type EmailLocale, getEmailTranslations } from '../i18n'

export type WaitlistRole = 'landlord' | 'tenant'

interface WaitlistContentProps {
  locale?: EmailLocale
  role: WaitlistRole
}

/**
 * Shared body of the waitlist welcome email. The structure is identical for
 * both roles — only the i18n strings differ — so the per-role entry files
 * (waitlist-landlord, waitlist-tenant) are thin wrappers over this.
 */
export function WaitlistContent({ locale = 'en', role }: WaitlistContentProps) {
  const tw = getEmailTranslations(locale).waitlistWelcome
  const t = tw[role]

  const headerContent = (
    <Section className="p-8" style={{ backgroundColor: '#1c1917' }}>
      <Text
        className="text-highlight text-xs font-semibold uppercase m-0"
        style={{ letterSpacing: '0.1em' }}
      >
        {t.eyebrow}
      </Text>
      <Text className="text-2xl font-bold text-white m-0 mt-2">{tw.heading}</Text>
      <Text className="text-base m-0 mt-2" style={{ color: '#d6d3d1' }}>
        {t.body}
      </Text>
    </Section>
  )

  return (
    <EmailLayout preview={t.preview} locale={locale} header={headerContent}>
      <Text className="text-sm font-semibold text-foreground m-0 mb-4">{tw.whatsComingTitle}</Text>
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
                    <Text className="text-sm text-secondary-foreground m-0">{benefit}</Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        ))}
      </table>
      <Hr className="border-card-border my-6" />
      <Text className="text-sm text-muted m-0">{tw.closingLine}</Text>
      <Text className="text-base text-muted-foreground mt-4 mb-0">{tw.signoff}</Text>
    </EmailLayout>
  )
}
