'use server'

import { createClient } from '@/lib/supabase/server'
import { resend, RESEND_FROM, RESEND_REPLY_TO } from '@/lib/resend/client'
import { InviteCode, type InviteSource } from '@/emails/invite-code'
import { type EmailLocale, getEmailTranslations } from '@/emails/i18n'
import { generateInviteCode } from '@/lib/invitations/generate-invite-code'

interface SendInviteOptions {
  email: string
  source?: InviteSource
  locale?: EmailLocale
  invitedBy: string
}

export async function sendInvite({
  email,
  source = 'direct',
  locale = 'en',
  invitedBy,
}: SendInviteOptions) {
  const supabase = await createClient()
  const code = generateInviteCode()

  // Insert invite into database
  const { error: dbError } = await supabase.from('invitations').insert({
    code,
    invited_email: email,
    invited_by: invitedBy,
    role: 'landlord',
    status: 'pending',
    source,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  })

  if (dbError) {
    return { success: false, error: dbError.message }
  }

  // Get translations for the right source/locale
  const t = getEmailTranslations(locale).inviteCode
  const variant = t[source]

  // Send invite email
  const signUpUrl = 'https://mabenn.com/auth/sign-up'

  const { error: emailError } = await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: variant.subject,
    replyTo: RESEND_REPLY_TO,
    react: InviteCode({ code, signUpUrl, source, locale }),
  })

  if (emailError) {
    return { success: false, error: emailError.message }
  }

  // TODO (PRO-30): Fire 'invite_sent' event with { email, source, locale } — needs server-side PostHog SDK

  return { success: true, code }
}
