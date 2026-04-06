import type { TypedSupabaseClient } from '@/lib/supabase/types'

/**
 * Recalculates a statement's total_amount_minor from its charge instances.
 * Called after any charge instance mutation (add, update, remove).
 */
export async function recalculateStatementTotal(
  supabase: TypedSupabaseClient,
  statementId: string,
): Promise<number> {
  const { data: instances } = await supabase
    .from('charge_instances')
    .select('amount_minor')
    .eq('statement_id', statementId)

  const total = (instances ?? []).reduce((sum, i) => sum + i.amount_minor, 0)

  await supabase
    .from('statements')
    .update({ total_amount_minor: total })
    .eq('id', statementId)

  return total
}
