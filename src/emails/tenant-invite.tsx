import { Text, Section } from '@react-email/components'
import { EmailLayout } from './components/layout'
import { EmailButton } from './components/email-button'
import { type EmailLocale, getEmailTranslations } from './i18n'

interface TenantInviteProps {
  tenantName: string | null
  landlordName: string
  propertyName: string
  addressHtml: string
  signUpUrl: string
  code: string
  expiresOnText: string
  locale?: EmailLocale
}

export function TenantInvite({
  tenantName,
  landlordName,
  propertyName,
  addressHtml,
  signUpUrl,
  code,
  expiresOnText,
  locale = 'en',
}: TenantInviteProps) {
  const t = getEmailTranslations(locale).tenantInvite
  const displayAddress = addressHtml || propertyName

  return (
    <EmailLayout preview={t.subject(propertyName)} locale={locale}>
      <Text className="text-base leading-6 text-secondary-foreground m-0 mb-5">
        {t.greeting(tenantName)} {t.intro(landlordName)}
      </Text>

      {displayAddress ? (
        <Section className="mb-5">
          <Text
            className="text-[15px] font-semibold text-foreground m-0 leading-6 border-l-[3px] border-solid border-primary pl-4"
            dangerouslySetInnerHTML={{ __html: displayAddress }}
          />
        </Section>
      ) : null}

      <Text className="text-[15px] leading-6 text-muted-foreground m-0 mb-6">
        {t.valueProp}
      </Text>

      <EmailButton href={signUpUrl}>{t.button}</EmailButton>

      <Text className="text-sm text-muted m-0 mt-3 text-center">
        {t.manualCode(code)}
      </Text>
      <Text className="text-sm text-muted m-0 mt-1 text-center">
        {expiresOnText}
      </Text>
    </EmailLayout>
  )
}

export default TenantInvite
