'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnit, unitQueryKey } from '@/lib/queries/unit'

export type { Unit } from '@/lib/queries/unit'

export function useUnit(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitQueryKey(unitId),
    queryFn: () => fetchUnit(supabase, unitId),
  })
}
