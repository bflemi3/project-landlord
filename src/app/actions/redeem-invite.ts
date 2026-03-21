'use server'

import { createClient } from '@/lib/supabase/server'

export async function redeemInviteCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false }

  const trimmedCode = code.trim().toUpperCase()

  // Find and redeem the invite
  const { data, error } = await supabase
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('code', trimmedCode)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (error || !data) {
    return { success: false }
  }

  return { success: true }
}
