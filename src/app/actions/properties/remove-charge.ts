'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function removeChargeCore(
  supabase: TypedSupabaseClient,
  chargeId: string,
): Promise<{ success: boolean }> {
  // Soft delete
  const { error } = await supabase
    .from('charge_definitions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', chargeId)

  return { success: !error }
}

export async function removeCharge(chargeId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return removeChargeCore(supabase, chargeId)
}
