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
    <Section className="em-pad-section p-8" style={{ backgroundColor: '#1c1917' }}>
      <Text
        className="text-highlight m-0 text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.1em' }}
      >
        {t.eyebrow}
      </Text>
      <Text className="m-0 mt-2 text-2xl font-bold text-white">{tw.heading}</Text>
      <Text className="m-0 mt-2 text-base" style={{ color: '#d6d3d1' }}>
        {t.body}
      </Text>
    </Section>
  )

  return (
    <EmailLayout preview={t.preview} locale={locale} header={headerContent}>
      <Text className="text-foreground m-0 mb-4 text-sm font-semibold">{tw.whatsComingTitle}</Text>
      <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
        {[t.benefit1, t.benefit2, t.benefit3].map((benefit, i) => (
          <tr key={i}>
            <td style={{ paddingBottom: i < 2 ? '12px' : '0' }}>
              <table cellPadding={0} cellSpacing={0} border={0}>
                <tr>
                  <td style={{ verticalAlign: 'top', paddingRight: '12px' }}>
                    <Text className="text-primary m-0 text-base font-bold">✓</Text>
                  </td>
                  <td>
                    <Text className="text-secondary-foreground m-0 text-sm">{benefit}</Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        ))}
      </table>
      <Hr className="border-card-border my-6" />
      <Text className="text-muted m-0 text-sm">{tw.closingLine}</Text>
      <Text className="text-muted-foreground mt-4 mb-0 text-base">{tw.signoff}</Text>
    </EmailLayout>
  )
}
