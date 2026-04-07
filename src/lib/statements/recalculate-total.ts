import type { TypedSupabaseClient } from '@/lib/supabase/types'

// =============================================================================
// Pure computation — testable without DB
// =============================================================================

export interface ChargeInstanceRow {
  amount_minor: number
  split_type: string
  tenant_percentage: number | null
  landlord_percentage: number | null
  tenant_fixed_minor: number | null
  landlord_fixed_minor: number | null
}

/**
 * Computes statement totals from charge instance rows.
 *
 * When one side's percentage is null, derives it as the complement of the
 * other side (e.g. landlord=100 + tenant=null → tenant=0%).
 * When both are null, defaults to tenant 100%.
 */
export function computeInstanceTotals(
  instances: ChargeInstanceRow[],
): { total: number; tenantTotal: number; landlordTotal: number } {
  let total = 0
  let tenantTotal = 0
  let landlordTotal = 0

  for (const i of instances) {
    total += i.amount_minor

    if (i.split_type === 'fixed_amount') {
      tenantTotal += i.tenant_fixed_minor ?? 0
      landlordTotal += i.landlord_fixed_minor ?? 0
    } else {
      // Derive complement when one side is null
      const landlordPct = i.landlord_percentage ?? (i.tenant_percentage !== null ? 100 - i.tenant_percentage : 0)
      const tenantPct = i.tenant_percentage ?? (100 - landlordPct)
      tenantTotal += Math.round(i.amount_minor * tenantPct / 100)
      landlordTotal += Math.round(i.amount_minor * landlordPct / 100)
    }
  }

  return { total, tenantTotal, landlordTotal }
}

// =============================================================================
// DB-aware wrapper
// =============================================================================

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

  const result = computeInstanceTotals(instances ?? [])

  await supabase
    .from('statements')
    .update({
      total_amount_minor: result.total,
      tenant_total_minor: result.tenantTotal,
      landlord_total_minor: result.landlordTotal,
    })
    .eq('id', statementId)

  return result
}
