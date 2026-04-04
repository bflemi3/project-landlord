import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { parseSplit, DEFAULT_SPLIT, type ChargeSplit, type AllocationRow } from '@/lib/split-allocations'

export type { ChargeSplit }

export interface ChargeDefinition {
  id: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  currency: string
  isActive: boolean
  split: ChargeSplit
}

export async function fetchUnitCharges(supabase: TypedSupabaseClient, unitId: string): Promise<ChargeDefinition[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select(`
      id, name, charge_type, amount_minor, currency, is_active,
      responsibility_allocations ( role, allocation_type, percentage, fixed_minor )
    `)
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at')

  if (error || !data) return []

  return data.map((c) => {
    const allocations = (c.responsibility_allocations ?? []) as unknown as AllocationRow[]
    return {
      id: c.id,
      name: c.name,
      chargeType: c.charge_type as ChargeDefinition['chargeType'],
      amountMinor: c.amount_minor,
      currency: c.currency,
      isActive: c.is_active,
      split: allocations.length > 0 ? parseSplit(allocations) : DEFAULT_SPLIT,
    }
  })
}

export const unitChargesQueryKey = (unitId: string) => ['unit-charges', unitId] as const
