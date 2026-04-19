'use server'

import { createClient } from '@/lib/supabase/server'
import { redeemInviteByCodeCore } from '@/data/profiles/actions/redeem-invite-by-code'

export async function redeemInviteCode(code: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false }

  const result = await redeemInviteByCodeCore(supabase, user.id, code)

  if (result.success) {
    await supabase.auth.refreshSession()
  }

  return result
}
