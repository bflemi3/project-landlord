import { type EmailLocale } from '@/emails/i18n'
import { type TypedSupabaseClient } from '@/lib/supabase/types'
import {
  type PropertyCountToken,
  type WaitlistRoleToken,
  type WorkflowToken,
} from '@/schemas/waitlist'

export interface CompleteWaitlistInput {
  email: string
  role: WaitlistRoleToken
  propertyCount: PropertyCountToken
  workflow: WorkflowToken[]
  feedback?: string
  locale: EmailLocale
}

/**
 * Enrich the already-captured waitlist row with the survey profile (role,
 * property count, workflow, feedback) and stamp it complete. No email here —
 * the welcome was sent at capture (the join). This step is optional from the
 * user's side; the DB write is the source of truth.
 */
export async function completeWaitlistCore(
  supabase: TypedSupabaseClient,
  input: CompleteWaitlistInput,
) {
  const { email, role, propertyCount, workflow, feedback, locale } = input

  try {
    const { error } = await supabase.rpc('waitlist_complete', {
      p_email: email,
      p_role: role,
      p_property_count: propertyCount,
      p_workflow: workflow,
      p_feedback: feedback ?? undefined,
      p_locale: locale,
    })
    if (error) {
      console.error('completeWaitlist: rpc failed for', email, '-', error.message)
      return { success: false }
    }
  } catch (err) {
    console.error('completeWaitlist: rpc threw for', email, '-', err instanceof Error ? err.message : String(err))
    return { success: false }
  }

  return { success: true }
}
