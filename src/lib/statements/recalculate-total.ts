import type { TypedSupabaseClient } from '@/lib/supabase/types'

/**
 * Recalculates a statement's totals from its charge instances.
 * Computes total, tenant portion, and landlord portion.
 * Called after any charge instance mutation (add, update, remove).
 */
export async function recalculateStatementTotal(
  supabase: TypedSupabaseClient,
  statementId: string,
): Promise<{ total: number; tenantTotal: number; landlordTotal: number }> {
  const { data: instances } = await supabase
    .from('charge_instances')
    .select('amount_minor, split_type, tenant_percentage, landlord_percentage, tenant_fixed_minor, landlord_fixed_minor')
    .eq('statement_id', statementId)

  let total = 0
  let tenantTotal = 0
  let landlordTotal = 0

  for (const i of instances ?? []) {
    total += i.amount_minor

    if (i.split_type === 'fixed_amount') {
      tenantTotal += i.tenant_fixed_minor ?? 0
      landlordTotal += i.landlord_fixed_minor ?? 0
    } else {
      // percentage split
      const tenantPct = i.tenant_percentage ?? 100
      const landlordPct = i.landlord_percentage ?? 0
      tenantTotal += Math.round(i.amount_minor * tenantPct / 100)
      landlordTotal += Math.round(i.amount_minor * landlordPct / 100)
    }
  }

  await supabase
    .from('statements')
    .update({
      total_amount_minor: total,
      tenant_total_minor: tenantTotal,
      landlord_total_minor: landlordTotal,
    })
    .eq('id', statementId)

  return { total, tenantTotal, landlordTotal }
}
