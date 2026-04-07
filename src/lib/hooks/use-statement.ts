'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchStatement, statementQueryKey } from '@/lib/queries/statement'

export type { Statement } from '@/lib/queries/statement'

export function useStatement(statementId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: statementQueryKey(statementId),
    queryFn: () => fetchStatement(supabase, statementId),
  })
}
