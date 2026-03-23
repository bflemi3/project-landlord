'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface PropertyDetail {
  id: string
  name: string
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_code: string
  currency: string
  units: {
    id: string
    name: string
    tenantCount: number
  }[]
}

async function fetchProperty(propertyId: string): Promise<PropertyDetail | null> {
  const supabase = createClient()

  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      id, name, street, number, complement, neighborhood,
      city, state, postal_code, country_code, currency
    `)
    .eq('id', propertyId)
    .is('deleted_at', null)
    .single()

  if (error || !property) return null

  const { data: units } = await supabase
    .from('units')
    .select('id, name')
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('name')

  const { data: tenantMemberships } = await supabase
    .from('memberships')
    .select('id, property_id, user_id')
    .eq('property_id', propertyId)
    .eq('role', 'tenant')
    .is('deleted_at', null)

  // For now, tenant count is at property level (not per-unit)
  const tenantCount = tenantMemberships?.length ?? 0

  return {
    ...property,
    units: (units ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      tenantCount,
    })),
  }
}

export function useProperty(propertyId: string) {
  return useSuspenseQuery({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
  })
}
