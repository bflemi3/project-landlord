'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface PropertyCounts {
  unitCount: number
  tenantCount: number
  chargeCount: number
  pendingInviteCount: number
}

async function fetchPropertyCounts(propertyIds: string[]): Promise<Record<string, PropertyCounts>> {
  if (propertyIds.length === 0) return {}

  const supabase = createClient()

  // Fetch units, tenant memberships, and invitations in parallel
  const [
    { data: units },
    { data: tenantMemberships },
    { data: invitations },
  ] = await Promise.all([
    supabase
      .from('units')
      .select('id, property_id')
      .in('property_id', propertyIds)
      .is('deleted_at', null),
    supabase
      .from('memberships')
      .select('id, property_id')
      .in('property_id', propertyIds)
      .eq('role', 'tenant')
      .is('deleted_at', null),
    supabase
      .from('invitations')
      .select('id, property_id')
      .in('property_id', propertyIds)
      .eq('status', 'pending'),
  ])

  // Build unit → property mapping, then fetch charges by unit_id
  const unitCountByProperty = new Map<string, number>()
  const unitToProperty = new Map<string, string>()
  for (const u of units ?? []) {
    unitCountByProperty.set(u.property_id, (unitCountByProperty.get(u.property_id) ?? 0) + 1)
    unitToProperty.set(u.id, u.property_id)
  }

  const unitIds = (units ?? []).map((u) => u.id)
  const chargeCountByProperty = new Map<string, number>()

  if (unitIds.length > 0) {
    const { data: charges } = await supabase
      .from('charge_definitions')
      .select('id, unit_id')
      .in('unit_id', unitIds)
      .is('deleted_at', null)

    for (const c of charges ?? []) {
      const propId = unitToProperty.get(c.unit_id)
      if (propId) {
        chargeCountByProperty.set(propId, (chargeCountByProperty.get(propId) ?? 0) + 1)
      }
    }
  }

  const tenantCountByProperty = new Map<string, number>()
  const pendingInviteCountByProperty = new Map<string, number>()

  for (const t of tenantMemberships ?? []) {
    tenantCountByProperty.set(t.property_id, (tenantCountByProperty.get(t.property_id) ?? 0) + 1)
  }
  for (const inv of invitations ?? []) {
    pendingInviteCountByProperty.set(inv.property_id, (pendingInviteCountByProperty.get(inv.property_id) ?? 0) + 1)
  }

  const result: Record<string, PropertyCounts> = {}
  for (const id of propertyIds) {
    result[id] = {
      unitCount: unitCountByProperty.get(id) ?? 0,
      tenantCount: tenantCountByProperty.get(id) ?? 0,
      chargeCount: chargeCountByProperty.get(id) ?? 0,
      pendingInviteCount: pendingInviteCountByProperty.get(id) ?? 0,
    }
  }
  return result
}

export function usePropertyCounts(propertyIds: string[]) {
  // Stable key: sorted and joined into a single string to avoid reference instability
  const stableKey = propertyIds.toSorted().join(',')
  return useSuspenseQuery({
    queryKey: ['property-counts', stableKey],
    queryFn: () => fetchPropertyCounts(propertyIds),
  })
}
