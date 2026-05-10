'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import type { Json } from '@/lib/types/database'
import { buildAllocationRows, type SplitInput } from '@/lib/split-allocations'

// chargeType is the legacy three-way picker in pre-pivot UIs. The schema now
// stores expense_type + amount_behavior instead. We translate at this boundary:
//   chargeType 'rent'/'recurring' -> amount_behavior 'fixed'
//   chargeType 'variable'         -> amount_behavior 'variable'
// Rent rows live in the rent table; this action only writes non-rent charges.
// expenseType is required by the new schema; the caller must supply it.
export interface UpdateChargeInput extends SplitInput {
  chargeId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  expenseType?: 'electricity' | 'water' | 'gas' | 'internet' | 'condo' | 'trash' | 'sewer' | 'cable' | 'maintenance' | 'insurance' | 'other'
  amountMinor: number | null
}

export async function updateChargeCore(
  supabase: TypedSupabaseClient,
  input: UpdateChargeInput,
): Promise<{ success: boolean }> {
  // Update charge definition
  const { error: chargeError } = await supabase
    .from('charge_definitions')
    .update({
      name: input.name,
      amount_behavior: input.chargeType === 'variable' ? 'variable' : 'fixed',
      ...(input.expenseType ? { expense_type: input.expenseType } : {}),
      amount_minor: input.amountMinor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.chargeId)

  if (chargeError) return { success: false }

  // Replace allocations atomically via RPC (single transaction)
  // Handles all transitions (single→split, split→single, percent→fixed)
  // Audit trigger logs the deletes and inserts automatically
  const allocations = buildAllocationRows(input)
  const { error: allocError } = await supabase.rpc('replace_allocations', {
    p_charge_definition_id: input.chargeId,
    p_allocations: allocations as unknown as Json,
  })

  if (allocError) return { success: false }

  return { success: true }
}

export async function updateCharge(input: UpdateChargeInput & { propertyId?: string }): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const result = await updateChargeCore(supabase, input)
  if (result.success) {
    revalidatePath(input.propertyId ? `/app/p/${input.propertyId}` : '/app', input.propertyId ? undefined : 'layout')
  }
  return result
}
