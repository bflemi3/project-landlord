import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface UnitStatement {
  id: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  tenantTotalMinor: number
  currency: string
  createdAt: string
}

export async function fetchUnitStatements(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<UnitStatement[]> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, period_year, period_month, status, total_amount_minor, tenant_total_minor, currency, created_at')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    status: row.status as UnitStatement['status'],
    totalAmountMinor: row.total_amount_minor,
    tenantTotalMinor: row.tenant_total_minor,
    currency: row.currency,
    createdAt: row.created_at,
  }))
}

export const unitStatementsQueryKey = (unitId: string) => ['unit-statements', unitId] as const
