'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface UnitDetail {
  id: string
  name: string
  propertyId: string
  propertyName: string
  tenants: {
    id: string
    name: string | null
    email: string | null
  }[]
  pendingInvites: {
    id: string
    email: string
    name: string | null
  }[]
}

async function fetchUnit(unitId: string): Promise<UnitDetail | null> {
  const supabase = createClient()

  const { data: unit, error } = await supabase
    .from('units')
    .select(`
      id, name, property_id,
      property:properties!inner ( id, name )
    `)
    .eq('id', unitId)
    .is('deleted_at', null)
    .single()

  if (error || !unit) return null

  const property = unit.property as unknown as { id: string; name: string }

  // Get tenant memberships for this property
  const { data: tenantMemberships } = await supabase
    .from('memberships')
    .select(`
      id,
      user:profiles!inner ( id, full_name, avatar_url )
    `)
    .eq('property_id', unit.property_id)
    .eq('role', 'tenant')
    .is('deleted_at', null)

  // Get pending invitations for this unit
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, invited_email, invited_name')
    .eq('unit_id', unitId)
    .eq('status', 'pending')

  return {
    id: unit.id,
    name: unit.name,
    propertyId: property.id,
    propertyName: property.name,
    tenants: (tenantMemberships ?? []).map((m) => {
      const user = m.user as unknown as { id: string; full_name: string | null; avatar_url: string | null }
      return {
        id: user.id,
        name: user.full_name,
        email: null, // Don't expose email in client queries
      }
    }),
    pendingInvites: (invitations ?? []).map((i) => ({
      id: i.id,
      email: i.invited_email,
      name: i.invited_name,
    })),
  }
}

export function useUnit(unitId: string) {
  return useSuspenseQuery({
    queryKey: ['unit', unitId],
    queryFn: () => fetchUnit(unitId),
  })
}
