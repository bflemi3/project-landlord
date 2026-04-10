'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import type { Json } from '@/lib/types/database'
import { buildAllocationRows, type SplitInput } from '@/lib/split-allocations'

export interface UpdateChargeInput extends SplitInput {
  chargeId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
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
      charge_type: input.chargeType,
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
