'use server'

import { createClient } from '@/lib/supabase/server'
import { joinWaitlistCore, type WaitlistRole } from '@/data/waitlist/actions/join-waitlist'
import { type EmailLocale } from '@/emails/i18n'

export async function joinWaitlist(
  email: string,
  locale: EmailLocale = 'en',
  role: WaitlistRole = 'landlord',
) {
  const supabase = await createClient()
  return joinWaitlistCore(supabase, email, locale, role)
}
