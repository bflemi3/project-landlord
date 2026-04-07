'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchHomeProperties, homePropertiesQueryKey } from '@/lib/queries/home-properties'

export type { HomeProperty } from '@/lib/queries/home-properties'

export function useHomeProperties() {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: homePropertiesQueryKey(),
    queryFn: () => fetchHomeProperties(supabase),
  })
}
