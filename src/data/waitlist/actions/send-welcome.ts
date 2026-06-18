import {
  resend,
  RESEND_FROM,
  RESEND_REPLY_TO,
  RESEND_WAITLIST_LANDLORD_SEGMENT_ID,
  RESEND_WAITLIST_TENANT_SEGMENT_ID,
} from '@/lib/resend/client'
import { WaitlistLandlord } from '@/emails/waitlist-landlord'
import { WaitlistTenant } from '@/emails/waitlist-tenant'
import { type EmailLocale, getEmailTranslations } from '@/emails/i18n'

// Only two welcome flows exist. The 5-role lead profile collapses to an email
// audience here: tenants get the tenant flow; everyone else (landlord, both,
// imobiliaria, other) gets the landlord flow.
export type WaitlistEmailRole = 'landlord' | 'tenant'

export function emailRoleFor(role: string): WaitlistEmailRole {
  return role === 'tenant' ? 'tenant' : 'landlord'
}

/**
 * Adds the contact to the role's Resend segment and sends the welcome email.
 * Best-effort by contract: the waitlist row is already the source of truth, so
 * every failure here only logs. Call this exactly once per signup (on the first
 * completion), never at the gate — role isn't known until the modal completes.
 */
export async function sendWaitlistWelcome(
  email: string,
  locale: EmailLocale,
  emailRole: WaitlistEmailRole,
): Promise<void> {
  const segmentId =
    emailRole === 'tenant'
      ? RESEND_WAITLIST_TENANT_SEGMENT_ID
      : RESEND_WAITLIST_LANDLORD_SEGMENT_ID

  if (!segmentId) {
    console.error(`sendWaitlistWelcome: missing Resend segment id for ${emailRole} - skipped for`, email)
    return
  }

  const t = getEmailTranslations(locale).waitlistWelcome
  try {
    const created = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    })
    if (created.error) {
      console.error('sendWaitlistWelcome: contacts.create failed for', email, '-', created.error.name, created.error.message)
    }

    const sent = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: t[emailRole].subject,
      replyTo: RESEND_REPLY_TO,
      react: emailRole === 'tenant' ? WaitlistTenant({ email, locale }) : WaitlistLandlord({ email, locale }),
    })
    if (sent.error) {
      console.error('sendWaitlistWelcome: welcome email failed for', email, '-', sent.error.name, sent.error.message)
    }
  } catch (err) {
    console.error('sendWaitlistWelcome: resend step threw for', email, '-', err instanceof Error ? err.message : String(err))
  }
}
