'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchProperty, propertyQueryKey } from '@/lib/queries/property'

export type { Property } from '@/lib/queries/property'

export function useProperty(propertyId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: propertyQueryKey(propertyId),
    queryFn: () => fetchProperty(supabase, propertyId),
  })
}
