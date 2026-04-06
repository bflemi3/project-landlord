'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'

export interface UpdateChargeInstanceInput {
  instanceId: string
  amountMinor: number
  name?: string
  /** Pass null to remove the attached document, string to set/replace */
  sourceDocumentId?: string | null
}

export async function updateChargeInstanceCore(
  supabase: TypedSupabaseClient,
  input: UpdateChargeInstanceInput,
): Promise<{ success: boolean }> {
  // Get the instance to find its statement_id
  const { data: existing } = await supabase
    .from('charge_instances')
    .select('statement_id')
    .eq('id', input.instanceId)
    .single()

  if (!existing) return { success: false }

  const updates: Record<string, unknown> = {
    amount_minor: input.amountMinor,
  }
  if (input.name !== undefined) updates.name = input.name
  if (input.sourceDocumentId !== undefined) updates.source_document_id = input.sourceDocumentId

  const { error } = await supabase
    .from('charge_instances')
    .update(updates)
    .eq('id', input.instanceId)

  if (error) return { success: false }

  await recalculateStatementTotal(supabase, existing.statement_id)

  return { success: true }
}

export async function updateChargeInstance(input: UpdateChargeInstanceInput): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return updateChargeInstanceCore(supabase, input)
}
