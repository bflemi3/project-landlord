'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnitInvites, unitInvitesQueryKey } from '@/lib/queries/unit-invites'

export type { UnitInvite } from '@/lib/queries/unit-invites'

export function useUnitInvites(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitInvitesQueryKey(unitId),
    queryFn: () => fetchUnitInvites(supabase, unitId),
  })
}
