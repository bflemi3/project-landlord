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

  // Update allocations in place
  const allocations = buildAllocationRows(input)
  for (const alloc of allocations) {
    await supabase
      .from('responsibility_allocations')
      .update({
        allocation_type: alloc.allocation_type,
        percentage: alloc.percentage,
        fixed_minor: alloc.fixed_minor,
        updated_at: new Date().toISOString(),
      })
      .eq('charge_definition_id', input.chargeId)
      .eq('role', alloc.role)
  }

  // If switching from split → single payer, remove the other role's allocation
  if (input.payer === 'tenant') {
    await supabase.from('responsibility_allocations').delete()
      .eq('charge_definition_id', input.chargeId).eq('role', 'landlord')
  } else if (input.payer === 'landlord') {
    await supabase.from('responsibility_allocations').delete()
      .eq('charge_definition_id', input.chargeId).eq('role', 'tenant')
  }

  return { success: true }
}

export async function updateCharge(input: UpdateChargeInput): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return updateChargeCore(supabase, input)
}
