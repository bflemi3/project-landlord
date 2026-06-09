'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getAccounts, getItem } from '@/lib/pluggy/client'

export type RegisterPluggyItemResult =
  | { success: true; bankItemId: string }
  | {
      success: false
      reason:
        | 'unauthenticated'
        | 'pluggy_fetch_failed'
        | 'invalid_input'
        | 'rpc_error'
    }

/**
 * Called by the client after the Pluggy Connect widget reports success.
 * Fetches the item + accounts from Pluggy, then persists them atomically
 * via the register_bank_item SECURITY DEFINER RPC.
 */
export async function registerPluggyItem(
  pluggyItemId: string,
): Promise<RegisterPluggyItemResult> {
  if (!pluggyItemId || pluggyItemId.trim().length === 0) {
    return { success: false, reason: 'invalid_input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, reason: 'unauthenticated' }

  let item
  let accounts
  try {
    ;[item, accounts] = await Promise.all([
      getItem(pluggyItemId),
      getAccounts(pluggyItemId),
    ])
  } catch (err) {
    console.error('[bank-accounts] Pluggy item/accounts fetch failed:', err)
    return { success: false, reason: 'pluggy_fetch_failed' }
  }

  const { data, error } = await supabase.rpc('register_bank_item', {
    p_pluggy_item_id: pluggyItemId,
    p_institution_id: String(item.connector.id),
    p_institution_name: item.connector.name,
    p_accounts: accounts.map((a) => ({
      pluggy_account_id: a.id,
      account_type: a.type,
      account_subtype: a.subtype ?? null,
      name: a.marketingName?.trim() || a.name,
      masked_number: a.number ?? null,
      currency_code: a.currencyCode || 'BRL',
    })),
  })

  if (error) {
    console.error('[bank-accounts] register_bank_item RPC error:', error)
    return { success: false, reason: 'rpc_error' }
  }

  const payload = data as {
    success: boolean
    bank_item_id?: string
    reason?: string
  } | null

  if (!payload || !payload.success || !payload.bank_item_id) {
    console.error('[bank-accounts] register_bank_item returned non-success:', payload)
    return { success: false, reason: 'rpc_error' }
  }

  revalidatePath('/app', 'layout')
  return { success: true, bankItemId: payload.bank_item_id }
}
