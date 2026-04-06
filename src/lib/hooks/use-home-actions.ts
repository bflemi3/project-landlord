'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchHomeActions, homeActionsQueryKey } from '@/lib/queries/home-actions'

export type { HomeAction } from '@/lib/queries/home-actions'

export function useHomeActions() {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: homeActionsQueryKey(),
    queryFn: () => fetchHomeActions(supabase),
  })
}
