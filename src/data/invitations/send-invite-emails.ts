import { TenantInvite } from '@/emails/tenant-invite'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'
import { resend, RESEND_FROM, RESEND_REPLY_TO } from '@/lib/resend/client'

const SIGN_UP_URL_BASE = 'https://mabenn.com/auth/sign-up'

export interface SendTenantInviteEmailParams {
  to: string
  tenantName: string | null
  landlordName: string
  propertyName: string
  addressHtml: string
  code: string
  expiresAt: string
  locale?: EmailLocale
}

export interface SendTenantInviteEmailResult {
  success: boolean
  error?: string
}

export async function sendTenantInviteEmail(
  params: SendTenantInviteEmailParams,
): Promise<SendTenantInviteEmailResult> {
  const {
    to,
    tenantName,
    landlordName,
    propertyName,
    addressHtml,
    code,
    expiresAt,
    locale = 'en',
  } = params

  const t = getEmailTranslations(locale).tenantInvite
  const expiresDate = new Date(expiresAt).toLocaleDateString(
    locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' },
  )

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      replyTo: RESEND_REPLY_TO,
      subject: t.subject(propertyName),
      react: TenantInvite({
        tenantName,
        landlordName,
        propertyName,
        addressHtml,
        signUpUrl: `${SIGN_UP_URL_BASE}?code=${encodeURIComponent(code)}`,
        code,
        expiresOnText: t.expiresOn(expiresDate),
        locale,
      }),
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown',
    }
  }
}
