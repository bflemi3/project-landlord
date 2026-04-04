'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchMissingCharges, missingChargesQueryKey } from '@/lib/queries/missing-charges'

export type { MissingCharge } from '@/lib/queries/missing-charges'

export function useMissingCharges(unitId: string, statementId: string, periodYear: number, periodMonth: number) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: missingChargesQueryKey(unitId, statementId),
    queryFn: () => fetchMissingCharges(supabase, unitId, statementId, periodYear, periodMonth),
  })
}
