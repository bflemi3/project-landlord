'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

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

async function fetchHomeProperties(): Promise<HomeProperty[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // The view handles deduplication and joins.
  // Filter by the current user's memberships.
  const { data, error } = await supabase
    .from('home_properties')
    .select('property_id, name, city, state, role, unit_count, tenant_count, charge_count, pending_invite_count')

  if (error || !data) return []

  return data.map((row) => ({
    propertyId: row.property_id,
    name: row.name,
    city: row.city,
    state: row.state,
    role: row.role as 'landlord' | 'tenant',
    unitCount: row.unit_count,
    tenantCount: row.tenant_count,
    chargeCount: row.charge_count,
    pendingInviteCount: row.pending_invite_count,
  }))
}

export function useHomeProperties() {
  return useSuspenseQuery({
    queryKey: ['home-properties'],
    queryFn: fetchHomeProperties,
  })
}
