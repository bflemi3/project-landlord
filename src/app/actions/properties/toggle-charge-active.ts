'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function toggleChargeActiveCore(
  supabase: TypedSupabaseClient,
  chargeId: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('charge_definitions')
    .update({ is_active: isActive })
    .eq('id', chargeId)

  return { success: !error }
}

export async function toggleChargeActive(
  chargeId: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return toggleChargeActiveCore(supabase, chargeId, isActive)
}
