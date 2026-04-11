'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

export function createSuspenseHook<TData, TArgs extends unknown[]>(
  keyFn: (...args: TArgs) => readonly unknown[],
  fetchFn: (supabase: TypedSupabaseClient, ...args: TArgs) => Promise<TData>,
) {
  return (...args: TArgs) => {
    return useSuspenseQuery({
      queryKey: keyFn(...args),
      queryFn: () => fetchFn(createClient(), ...args),
    })
  }
}
