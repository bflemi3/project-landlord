'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import type { Json } from '@/lib/types/database'
import { buildAllocationRows, type SplitInput } from '@/lib/split-allocations'
import type {
  ExpenseAmountBehavior as AmountBehaviorInput,
  ExpenseType as ExpenseTypeInput,
} from '@/schemas/expense'

// Inputs for updating an expense charge_definitions row. Rent does NOT live
// in charge_definitions under the post-pivot model; rent updates go through
// a separate flow against the rent table. The `*Input` aliases come from
// the canonical `@/schemas/expense` so this module can't drift from the DB
// enums.
export type { ExpenseTypeInput, AmountBehaviorInput }

export interface UpdateChargeInput extends SplitInput {
  chargeId: string
  name: string
  expenseType: ExpenseTypeInput
  amountBehavior: AmountBehaviorInput
  amountMinor: number | null
}

export async function updateChargeCore(
  supabase: TypedSupabaseClient,
  input: UpdateChargeInput,
): Promise<{ success: boolean }> {
  const { error: chargeError } = await supabase
    .from('charge_definitions')
    .update({
      name: input.name,
      expense_type: input.expenseType,
      amount_behavior: input.amountBehavior,
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
