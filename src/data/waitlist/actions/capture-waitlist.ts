import { type EmailLocale } from '@/emails/i18n'
import { type TypedSupabaseClient } from '@/lib/supabase/types'
import { type Attribution } from '@/lib/analytics/utm'
import { type WaitlistRoleToken } from '@/schemas/waitlist'
import { emailRoleFor, sendWaitlistWelcome } from './send-welcome'

export interface CaptureWaitlistInput {
  email: string
  locale: EmailLocale
  // The inline toggle's role (landlord/tenant) — enough to pick the welcome
  // flavor; refined to the full 5-role set when the survey completes.
  role: WaitlistRoleToken
  attribution: Attribution
}

/**
 * The waitlist join: write the email + first-touch attribution and, on a
 * genuinely new signup, send the welcome email + add the Resend contact. This is
 * the moment the person is "on the list" — the enrich modal is optional after.
 * Idempotent (first signup wins on email conflict); `isNew` reports whether this
 * call created the row, so the caller fires `identify`/`waitlist_joined` and we
 * send the welcome exactly once. Resend is best-effort; the DB write is the
 * source of truth.
 */
export async function captureWaitlistCore(
  supabase: TypedSupabaseClient,
  input: CaptureWaitlistInput,
) {
  const { email, locale, role, attribution } = input

  let isNew = false
  try {
    const { data, error } = await supabase.rpc('waitlist_capture', {
      p_email: email,
      p_locale: locale,
      p_role: role,
      // The RPC params are nullable; pass undefined (omit) for absent values so
      // the SQL defaults to NULL — `null` wouldn't satisfy the `string?` type.
      p_utm_source: attribution.utm_source ?? undefined,
      p_utm_medium: attribution.utm_medium ?? undefined,
      p_utm_campaign: attribution.utm_campaign ?? undefined,
      p_utm_content: attribution.utm_content ?? undefined,
      p_utm_term: attribution.utm_term ?? undefined,
      p_referrer: attribution.referrer ?? undefined,
      p_landing_path: attribution.landing_path,
    })
    if (error) {
      console.error('captureWaitlist: rpc failed for', email, '-', error.message)
      return { success: false, isNew: false }
    }
    isNew = data === true
  } catch (err) {
    console.error('captureWaitlist: rpc threw for', email, '-', err instanceof Error ? err.message : String(err))
    return { success: false, isNew: false }
  }

  // Welcome + segment exactly once, when the email first lands.
  if (isNew) {
    await sendWaitlistWelcome(email, locale, emailRoleFor(role))
  }

  return { success: true, isNew }
}
