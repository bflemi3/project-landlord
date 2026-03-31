'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnitCharges, unitChargesQueryKey } from '@/lib/queries/unit-charges'

export type { ChargeDefinition, ChargeSplit } from '@/lib/queries/unit-charges'

export function useUnitCharges(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitChargesQueryKey(unitId),
    queryFn: () => fetchUnitCharges(supabase, unitId),
  })
}
