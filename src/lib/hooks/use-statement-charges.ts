'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchStatementCharges, statementChargesQueryKey } from '@/lib/queries/statement-charges'

export type { ChargeInstance } from '@/lib/queries/statement-charges'

export function useStatementCharges(statementId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: statementChargesQueryKey(statementId),
    queryFn: () => fetchStatementCharges(supabase, statementId),
  })
}
