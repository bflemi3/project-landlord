'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface MembershipWithProperty {
  id: string
  role: 'landlord' | 'tenant'
  property: {
    id: string
    name: string
    street: string | null
    number: string | null
    city: string | null
    state: string | null
  }
}

async function fetchMemberships(): Promise<MembershipWithProperty[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      property:properties!inner (
        id,
        name,
        street,
        number,
        city,
        state
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error || !memberships) return []

  return memberships.map((m) => {
    const property = m.property as unknown as MembershipWithProperty['property']
    return {
      id: m.id,
      role: m.role as 'landlord' | 'tenant',
      property,
    }
  })
}

export function useMemberships() {
  return useSuspenseQuery({
    queryKey: ['memberships'],
    queryFn: fetchMemberships,
  })
}
