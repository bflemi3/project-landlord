import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface MissingCharge {
  definitionId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
}

/**
 * Fetches active charge definitions for the unit that have no matching
 * charge instance on the given statement. These are "expected" charges
 * that appear as completeness warnings.
 */
export async function fetchMissingCharges(
  supabase: TypedSupabaseClient,
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<MissingCharge[]> {
  // Get all active definitions for this unit
  const { data: definitions, error: defError } = await supabase
    .from('charge_definitions')
    .select('id, name, charge_type, amount_minor, recurring_rules ( start_date, end_date )')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (defError || !definitions) return []

  // Get all charge instances on this statement that reference a definition
  const { data: instances, error: instError } = await supabase
    .from('charge_instances')
    .select('charge_definition_id')
    .eq('statement_id', statementId)
    .not('charge_definition_id', 'is', null)

  if (instError) return []

  const coveredIds = new Set((instances ?? []).map((i) => i.charge_definition_id))

  // Filter to definitions not covered and in period
  return definitions
    .filter((def) => !coveredIds.has(def.id))
    .filter((def) => {
      const rules = (def.recurring_rules ?? []) as unknown as { start_date: string; end_date: string | null }[]
      const rule = rules[0]
      if (!rule) return true // no rule = always active
      const periodKey = periodYear * 100 + periodMonth
      const [sy, sm] = rule.start_date.split('-').map(Number)
      if (periodKey < sy * 100 + sm) return false
      if (rule.end_date) {
        const [ey, em] = rule.end_date.split('-').map(Number)
        if (periodKey > ey * 100 + em) return false
      }
      return true
    })
    .map((def) => ({
      definitionId: def.id,
      name: def.name,
      chargeType: def.charge_type as MissingCharge['chargeType'],
      amountMinor: def.amount_minor,
    }))
}

export const missingChargesQueryKey = (unitId: string, statementId: string) =>
  ['missing-charges', unitId, statementId] as const
