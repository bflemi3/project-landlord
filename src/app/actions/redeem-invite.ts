'use server'

import { createClient } from '@/lib/supabase/server'
import { redeemInviteByCodeCore } from './redeem-invite-by-code'

export async function redeemInviteCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false }

  return redeemInviteByCodeCore(supabase, user.id, code)
}
