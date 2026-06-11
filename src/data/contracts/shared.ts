import type { TypedSupabaseClient } from '@/lib/supabase/types'

// active = a live (is_active) contract exists; inactive = contract(s) exist but
// none active (closed/ended); none = no contract at all.
export type ContractStatus = 'active' | 'inactive' | 'none'

export const propertyContractStatusQueryKey = (propertyId: string) =>
  ['property-contract-status', propertyId] as const

/**
 * The property's contract status for the page-header indicator. Derived only
 * from contract existence + `is_active` (upload/extraction state is irrelevant).
 * Scoped to the property's units; soft-deleted contracts and units are excluded.
 */
export async function fetchPropertyContractStatus(
  supabase: TypedSupabaseClient,
  propertyId: string,
): Promise<ContractStatus> {
  const { data, error } = await supabase
    .from('contracts')
    .select('is_active, units!inner(property_id, deleted_at)')
    .eq('units.property_id', propertyId)
    .is('deleted_at', null)
    .is('units.deleted_at', null)

  if (error) throw error
  if (!data || data.length === 0) return 'none'
  return data.some((row) => row.is_active) ? 'active' : 'inactive'
}
