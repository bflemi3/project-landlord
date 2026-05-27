import { WaitlistContent } from './components/waitlist-content'
import { type EmailLocale } from './i18n'

interface WaitlistTenantProps {
  email: string
  locale?: EmailLocale
}

export function WaitlistTenant({ locale = 'en' }: WaitlistTenantProps) {
  return <WaitlistContent locale={locale} role="tenant" />
}

WaitlistTenant.PreviewProps = {
  email: 'maria@example.com',
  locale: 'en',
} satisfies WaitlistTenantProps

export default WaitlistTenant
