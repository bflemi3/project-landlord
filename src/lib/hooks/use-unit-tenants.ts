'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnitTenants, unitTenantsQueryKey } from '@/lib/queries/unit-tenants'

export type { UnitTenant } from '@/lib/queries/unit-tenants'

export function useUnitTenants(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitTenantsQueryKey(unitId),
    queryFn: () => fetchUnitTenants(supabase, unitId),
  })
}
