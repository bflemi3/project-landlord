'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'

export async function removeChargeInstanceCore(
  supabase: TypedSupabaseClient,
  instanceId: string,
): Promise<{ success: boolean; error?: string }> {
  // Get the instance to verify it's manual and find the statement_id
  const { data: instance } = await supabase
    .from('charge_instances')
    .select('statement_id, charge_definition_id')
    .eq('id', instanceId)
    .single()

  if (!instance) return { success: false, error: 'Charge instance not found' }

  // Only allow removing manually-added charges (no charge_definition_id)
  if (instance.charge_definition_id) {
    return { success: false, error: 'Cannot remove definition-generated charges' }
  }

  const { error } = await supabase
    .from('charge_instances')
    .delete()
    .eq('id', instanceId)

  if (error) return { success: false, error: error.message }

  await recalculateStatementTotal(supabase, instance.statement_id)

  return { success: true }
}

export async function removeChargeInstance(instanceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  return removeChargeInstanceCore(supabase, instanceId)
}
