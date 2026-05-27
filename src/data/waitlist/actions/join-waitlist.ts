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
import { type TypedSupabaseClient } from '@/lib/supabase/types'

export type WaitlistRole = 'landlord' | 'tenant'

/**
 * Records a waitlist signup in the `waitlist` table via the SECURITY DEFINER
 * RPC (the source of truth and idempotency signal). On a genuinely new signup
 * it routes a Resend contact to the role's segment and sends the welcome email.
 *
 * Success is gated on the DB write; Resend is best-effort. The welcome email is
 * sent only when the RPC reports a new row, so repeat signups don't re-email —
 * the table is the dedup, not the (unreliable) Resend contacts.get lookup.
 */
export async function joinWaitlistCore(
  supabase: TypedSupabaseClient,
  email: string,
  locale: EmailLocale = 'en',
  role: WaitlistRole = 'landlord',
) {
  const segmentId =
    role === 'tenant' ? RESEND_WAITLIST_TENANT_SEGMENT_ID : RESEND_WAITLIST_LANDLORD_SEGMENT_ID

  if (!segmentId) {
    console.error(`joinWaitlist: missing Resend segment id for role ${role} - contact not created for`, email)
    return { success: false }
  }

  // Source of truth. Gate success on it; its return tells us if this is new.
  let isNew = false
  try {
    const { data, error } = await supabase.rpc('join_waitlist', {
      p_email: email,
      p_role: role,
      p_locale: locale,
    })
    if (error) {
      console.error('joinWaitlist: supabase join_waitlist rpc failed for', email, '-', error.message)
      return { success: false }
    }
    isNew = data === true
  } catch (err) {
    console.error('joinWaitlist: supabase rpc threw for', email, '-', err instanceof Error ? err.message : String(err))
    return { success: false }
  }

  // Already on the list — captured before, don't re-add or re-email.
  if (!isNew) {
    return { success: true }
  }

  // New signup: add the Resend contact to the role's segment + send the welcome
  // email. Best-effort — the signup is already saved, so failures only log.
  const t = getEmailTranslations(locale).waitlistWelcome
  try {
    const created = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    })
    if (created.error) {
      console.error('joinWaitlist: contacts.create failed for', email, '-', created.error.name, created.error.message)
    }

    const sent = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: t[role].subject,
      replyTo: RESEND_REPLY_TO,
      react: role === 'tenant' ? WaitlistTenant({ email, locale }) : WaitlistLandlord({ email, locale }),
    })
    if (sent.error) {
      console.error('joinWaitlist: welcome email failed for', email, '-', sent.error.name, sent.error.message)
    }
  } catch (err) {
    console.error('joinWaitlist: resend step threw for', email, '-', err instanceof Error ? err.message : String(err))
  }

  return { success: true }
}
