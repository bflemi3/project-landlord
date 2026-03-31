'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { buildAllocationRows, type SplitInput } from '@/lib/split-allocations'

export interface UpdateChargeInput extends SplitInput {
  chargeId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  dueDay: number
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

  // Update recurring rule due day
  const { error: ruleError } = await supabase
    .from('recurring_rules')
    .update({
      day_of_month: input.dueDay,
      updated_at: new Date().toISOString(),
    })
    .eq('charge_definition_id', input.chargeId)

  if (ruleError) return { success: false }

  // Replace allocations — delete all existing, insert new
  // Handles all transitions (single→split, split→single, percent→fixed)
  // Audit trigger logs the deletes and inserts automatically
  const { error: deleteError } = await supabase
    .from('responsibility_allocations')
    .delete()
    .eq('charge_definition_id', input.chargeId)

  if (deleteError) return { success: false }

  const allocations = buildAllocationRows(input).map((a) => ({
    ...a,
    charge_definition_id: input.chargeId,
  }))

  const { error: insertError } = await supabase
    .from('responsibility_allocations')
    .insert(allocations)

  if (insertError) return { success: false }

  return { success: true }
}

export async function updateCharge(input: UpdateChargeInput): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return updateChargeCore(supabase, input)
}
