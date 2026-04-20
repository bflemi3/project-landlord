'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

/**
 * Thin wrapper around the `redeem_invite` SECURITY DEFINER RPC.
 *
 * All redemption logic lives in the RPC (atomic, privilege-aware, uses
 * auth.uid() for identity). Callers must still call refreshSession() before
 * redirecting to /app — see docs/project/architecture-auth.md.
 *
 * The `_userId` parameter is preserved for call-site compatibility but is
 * ignored: the RPC identifies the caller via auth.uid() on the JWT.
 */
export async function redeemInviteByCodeCore(
  supabase: TypedSupabaseClient,
  _userId: string,
  inviteCode: string,
): Promise<{ success: boolean; source?: string | null; reason?: string }> {
  const { data, error } = await supabase.rpc('redeem_invite', { invite_code: inviteCode })

  if (error) return { success: false, reason: 'rpc_error' }
  if (!data) return { success: false, reason: 'rpc_empty' }

  return data as { success: boolean; source?: string | null; reason?: string }
}

export async function redeemInviteByCode(
  userId: string,
  inviteCode: string,
): Promise<{ success: boolean; source?: string | null; reason?: string }> {
  const supabase = await createClient()
  return redeemInviteByCodeCore(supabase, userId, inviteCode)
}
