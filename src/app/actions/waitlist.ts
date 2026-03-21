'use server'

import { resend, RESEND_FROM, RESEND_REPLY_TO, RESEND_WAITLIST_SEGMENT_ID } from '@/lib/resend/client'
import { WaitlistWelcome } from '@/emails/waitlist-welcome'
import { type EmailLocale, getEmailTranslations } from '@/emails/i18n'

export async function joinWaitlist(email: string, locale: EmailLocale = 'en') {
  const t = getEmailTranslations(locale).waitlistWelcome

  try {
    // Check if contact already exists
    const { data: existing } = await resend.contacts.get({ email })

    if (existing) {
      // Already on the waitlist — show success but don't send another email
      return { success: true }
    }

    // Add new contact with waitlist segment
    await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: RESEND_WAITLIST_SEGMENT_ID }],
    })

    // Send welcome email for new signups only
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: t.subject,
      replyTo: RESEND_REPLY_TO,
      react: WaitlistWelcome({ email, locale }),
    })

    return { success: true }
  } catch {
    return { success: true }
  }
}
