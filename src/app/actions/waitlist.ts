'use server'

import { resend, RESEND_FROM, RESEND_REPLY_TO, RESEND_WAITLIST_SEGMENT_ID } from '@/lib/resend/client'
import { WaitlistWelcome } from '@/emails/waitlist-welcome'
import { type EmailLocale, getEmailTranslations } from '@/emails/i18n'

export async function joinWaitlist(email: string, locale: EmailLocale = 'en') {
  const t = getEmailTranslations(locale).waitlistWelcome

  if (!RESEND_WAITLIST_SEGMENT_ID) {
    console.error('joinWaitlist: RESEND_WAITLIST_SEGMENT_ID is not set — contact not created for', email)
    return { success: false }
  }

  try {
    // Already on the waitlist — succeed without re-adding or re-emailing.
    const existing = await resend.contacts.get({ email })
    if (existing.data) {
      return { success: true }
    }
    // not_found is the expected response for a new email; anything else is real.
    if (existing.error && existing.error.name !== 'not_found') {
      console.error('joinWaitlist: contacts.get failed for', email, '-', existing.error.name, existing.error.message)
    }

    const created = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: RESEND_WAITLIST_SEGMENT_ID }],
    })
    if (created.error) {
      console.error('joinWaitlist: contacts.create failed for', email, '-', created.error.name, created.error.message)
      return { success: false }
    }

    // Welcome email for new signups only. A failed send shouldn't fail the
    // signup — the contact is already saved — but it must be visible.
    const sent = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: t.subject,
      replyTo: RESEND_REPLY_TO,
      react: WaitlistWelcome({ email, locale }),
    })
    if (sent.error) {
      console.error('joinWaitlist: welcome email failed for', email, '-', sent.error.name, sent.error.message)
    }

    return { success: true }
  } catch (err) {
    console.error('joinWaitlist: unexpected error for', email, '-', err instanceof Error ? err.message : String(err))
    return { success: false }
  }
}
