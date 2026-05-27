import { WaitlistContent } from './components/waitlist-content'
import { type EmailLocale } from './i18n'

interface WaitlistLandlordProps {
  email: string
  locale?: EmailLocale
}

export function WaitlistLandlord({ locale = 'en' }: WaitlistLandlordProps) {
  return <WaitlistContent locale={locale} role="landlord" />
}

WaitlistLandlord.PreviewProps = {
  email: 'maria@example.com',
  locale: 'en',
} satisfies WaitlistLandlordProps

export default WaitlistLandlord
