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
      <Text className="text-secondary-foreground m-0 mb-5 text-base leading-6">
        {t.greeting(tenantName)} {t.intro(landlordName)}
      </Text>

      {displayAddress ? (
        <Section className="mb-5">
          <Text
            className="text-foreground border-primary m-0 border-l-[3px] border-solid pl-4 text-[15px] leading-6 font-semibold"
            dangerouslySetInnerHTML={{ __html: displayAddress }}
          />
        </Section>
      ) : null}

      <Text className="text-muted-foreground m-0 mb-6 text-[15px] leading-6">{t.valueProp}</Text>

      <EmailButton href={signUpUrl}>{t.button}</EmailButton>

      <Text className="text-muted m-0 mt-3 text-center text-sm">{t.manualCode(code)}</Text>
      <Text className="text-muted m-0 mt-1 text-center text-sm">{expiresOnText}</Text>
    </EmailLayout>
  )
}

export default TenantInvite
