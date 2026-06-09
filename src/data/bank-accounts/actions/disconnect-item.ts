'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { deleteItem } from '@/lib/pluggy/client'

export type DisconnectBankItemResult =
  | { success: true }
  | {
      success: false
      reason: 'unauthenticated' | 'invalid_input' | 'not_found' | 'rpc_error'
    }

/**
 * Soft-disconnect a bank_item owned by the calling user. The RPC commits
 * first; the Pluggy DELETE is best-effort (warn-only on failure).
 */
export async function disconnectBankItem(
  bankItemId: string,
): Promise<DisconnectBankItemResult> {
  if (!bankItemId || bankItemId.trim().length === 0) {
    return { success: false, reason: 'invalid_input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, reason: 'unauthenticated' }

  const { data, error } = await supabase.rpc('disconnect_bank_item', {
    p_bank_item_id: bankItemId,
  })

  if (error) {
    console.error('[bank-accounts] disconnect_bank_item RPC error:', error)
    return { success: false, reason: 'rpc_error' }
  }

  const payload = data as {
    success: boolean
    pluggy_item_id?: string
    reason?: string
  } | null

  if (!payload || !payload.success) {
    if (payload?.reason === 'not_found') {
      return { success: false, reason: 'not_found' }
    }
    return { success: false, reason: 'rpc_error' }
  }

  if (payload.pluggy_item_id) {
    try {
      await deleteItem(payload.pluggy_item_id)
    } catch (err) {
      console.warn(
        '[bank-accounts] best-effort Pluggy DELETE failed; row already soft-deleted:',
        err,
      )
    }
  }

  revalidatePath('/app', 'layout')
  return { success: true }
}
