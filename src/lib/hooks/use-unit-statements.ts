'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnitStatements, unitStatementsQueryKey } from '@/lib/queries/unit-statements'

export type { UnitStatement } from '@/lib/queries/unit-statements'

export function useUnitStatements(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitStatementsQueryKey(unitId),
    queryFn: () => fetchUnitStatements(supabase, unitId),
  })
}
