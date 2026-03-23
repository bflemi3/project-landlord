'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface MembershipWithProperty {
  id: string
  role: 'landlord' | 'tenant'
  property: {
    id: string
    name: string
    street: string | null
    number: string | null
    city: string | null
    state: string | null
  }
  unitCount: number
  tenantCount: number
}

async function fetchMemberships(): Promise<MembershipWithProperty[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      property:properties!inner (
        id,
        name,
        street,
        number,
        city,
        state
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error || !memberships) return []

  // Fetch unit and tenant counts per property
  const propertyIds = memberships.map((m) => (m.property as unknown as { id: string }).id)

  const { data: units } = await supabase
    .from('units')
    .select('id, property_id')
    .in('property_id', propertyIds)
    .is('deleted_at', null)

  const { data: tenantMemberships } = await supabase
    .from('memberships')
    .select('id, property_id')
    .in('property_id', propertyIds)
    .eq('role', 'tenant')
    .is('deleted_at', null)

  const unitCountByProperty = new Map<string, number>()
  const tenantCountByProperty = new Map<string, number>()

  for (const u of units ?? []) {
    unitCountByProperty.set(u.property_id, (unitCountByProperty.get(u.property_id) ?? 0) + 1)
  }
  for (const t of tenantMemberships ?? []) {
    tenantCountByProperty.set(t.property_id, (tenantCountByProperty.get(t.property_id) ?? 0) + 1)
  }

  return memberships.map((m) => {
    const property = m.property as unknown as MembershipWithProperty['property']
    return {
      id: m.id,
      role: m.role as 'landlord' | 'tenant',
      property,
      unitCount: unitCountByProperty.get(property.id) ?? 0,
      tenantCount: tenantCountByProperty.get(property.id) ?? 0,
    }
  })
}

export function useMemberships() {
  return useSuspenseQuery({
    queryKey: ['memberships'],
    queryFn: fetchMemberships,
  })
}
