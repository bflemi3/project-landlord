'use server'

import { createClient } from '@/lib/supabase/server'
import {
  captureWaitlistCore,
  type CaptureWaitlistInput,
} from '@/data/waitlist/actions/capture-waitlist'
import {
  completeWaitlistCore,
  type CompleteWaitlistInput,
} from '@/data/waitlist/actions/complete-waitlist'

/**
 * Gate: capture the email + first-touch attribution. This is the join — on a new
 * signup the core sends the welcome + adds the Resend contact.
 */
export async function captureWaitlist(input: CaptureWaitlistInput) {
  const supabase = await createClient()
  return captureWaitlistCore(supabase, input)
}

/** Enrich: persist the optional survey profile onto the already-joined row. */
export async function completeWaitlist(input: CompleteWaitlistInput) {
  const supabase = await createClient()
  return completeWaitlistCore(supabase, input)
}
