import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface HomeProperty {
  propertyId: string
  name: string
  city: string | null
  state: string | null
  role: 'landlord' | 'tenant'
  unitCount: number
  tenantCount: number
  chargeCount: number
  pendingInviteCount: number
}

export async function fetchHomeProperties(supabase: TypedSupabaseClient): Promise<HomeProperty[]> {
  const { data, error } = await supabase
    .from('home_properties')
    .select('property_id, name, city, state, role, unit_count, tenant_count, charge_count, pending_invite_count')

  if (error || !data) return []

  return data.map((row) => ({
    propertyId: row.property_id!,
    name: row.name!,
    city: row.city,
    state: row.state,
    role: row.role as 'landlord' | 'tenant',
    unitCount: row.unit_count ?? 0,
    tenantCount: row.tenant_count ?? 0,
    chargeCount: row.charge_count ?? 0,
    pendingInviteCount: row.pending_invite_count ?? 0,
  }))
}

export const homePropertiesQueryKey = () => ['home-properties'] as const
