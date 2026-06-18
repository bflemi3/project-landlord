// Server-only. Called by the Pluggy webhook Edge Function (Task 6) once per
// transaction. Wraps the apply_pluggy_transaction SECURITY DEFINER RPC.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'
import type {
  ApplyPluggyTransactionInput,
  ApplyPluggyTransactionResult,
} from '../shared'

export type ApplyPluggyTransactionArgs = {
  bankAccountId: string
  transaction: ApplyPluggyTransactionInput
}

/**
 * Calls the apply_pluggy_transaction RPC with the service role. The RPC is
 * idempotent on (bank_account_id, pluggy_transaction_id) and is service-role
 * gated by grant, so this caller must use the service role key.
 */
export async function applyPluggyTransactionCore(
  client: ReturnType<typeof createSupabaseClient<Database>>,
  args: ApplyPluggyTransactionArgs,
): Promise<ApplyPluggyTransactionResult> {
  const { data, error } = await client.rpc('apply_pluggy_transaction', {
    p_bank_account_id: args.bankAccountId,
    p_transaction: args.transaction as never,
  })
  if (error) {
    return { success: false, reason: error.message }
  }
  return (data ?? { success: false, reason: 'no_result' }) as ApplyPluggyTransactionResult
}
