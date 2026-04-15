'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
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
    .or('expires_at.is.null,expires_at.gt.now()')
    .select('source, role, property_id, unit_id')
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

  // Create tenant membership if applicable
  if (invite.role === 'tenant' && invite.property_id && invite.unit_id) {
    await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        property_id: invite.property_id,
        unit_id: invite.unit_id,
        role: 'tenant' as const,
      })
      .select('id')
      .single()
    // ON CONFLICT is handled by the unique constraint — duplicate insert is a no-op
  }

  // Sync has_redeemed_invite to JWT claims via raw_app_meta_data.
  // The DB trigger chain doesn't reliably sync during the auth.users INSERT
  // transaction, so we do it explicitly here with the service role client.
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await serviceClient.auth.admin.updateUserById(userId, {
    app_metadata: { has_redeemed_invite: true },
  })

  return { success: true, source: invite.source }
}

export async function redeemInviteByCode(
  userId: string,
  inviteCode: string,
): Promise<{ success: boolean; source?: string | null }> {
  const supabase = await createClient()
  return redeemInviteByCodeCore(supabase, userId, inviteCode)
}
