'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

/**
 * Redeems an invite code for a user — updates the invitation and sets
 * has_redeemed_invite + acquisition_channel on the profile.
 *
 * Used by:
 * - Google OAuth callback (cookie-based redemption)
 * - Any future flow that redeems invites outside the DB trigger
 */
export async function redeemInviteByCodeCore(
  supabase: TypedSupabaseClient,
  userId: string,
  inviteCode: string,
): Promise<{ success: boolean; source?: string | null }> {
  const code = inviteCode.trim().toUpperCase()

  // Update invitation to accepted
  const { data: invite, error } = await supabase
    .from('invitations')
    .update({
      status: 'accepted' as const,
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('code', code)
    .eq('status', 'pending')
    .select('source')
    .single()

  if (error || !invite) return { success: false }

  // Set profile fields
  await supabase
    .from('profiles')
    .update({
      has_redeemed_invite: true,
      acquisition_channel: invite.source,
    })
    .eq('id', userId)

  return { success: true, source: invite.source }
}

export async function redeemInviteByCode(
  userId: string,
  inviteCode: string,
): Promise<{ success: boolean; source?: string | null }> {
  const supabase = await createClient()
  return redeemInviteByCodeCore(supabase, userId, inviteCode)
}
