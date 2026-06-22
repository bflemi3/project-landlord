'use server'

import { createClient } from '@/lib/supabase/server'
import { createConnectToken } from '@/lib/pluggy/client'

export type CreateConnectTokenResult =
  | { success: true; accessToken: string }
  | { success: false; reason: 'unauthenticated' | 'pluggy_error' }

/**
 * Mint a short-lived Pluggy connect token for the calling user. Pass
 * `itemId` to enter update / reconnect mode for an existing connection.
 */
export async function createPluggyConnectToken(
  options: { itemId?: string } = {},
): Promise<CreateConnectTokenResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, reason: 'unauthenticated' }

  try {
    // Bind the item to this user so registerPluggyItem can verify ownership.
    const { accessToken } = await createConnectToken({
      ...options,
      clientUserId: user.id,
    })
    return { success: true, accessToken }
  } catch (err) {
    console.error('[bank-accounts] createConnectToken failed:', err)
    return { success: false, reason: 'pluggy_error' }
  }
}
