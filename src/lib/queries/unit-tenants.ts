import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface UnitTenant {
  id: string
  userId: string
  name: string | null
  email: string | null
  joinedAt: string
}

export async function fetchUnitTenants(supabase: TypedSupabaseClient, unitId: string): Promise<UnitTenant[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      created_at,
      profile:profiles!inner ( full_name, email )
    `)
    .eq('unit_id', unitId)
    .eq('role', 'tenant')
    .is('deleted_at', null)

  if (error || !data) return []

  return data.map((m) => {
    const profile = m.profile as unknown as { full_name: string | null; email: string | null }
    return {
      id: m.id,
      userId: m.user_id,
      name: profile.full_name,
      email: profile.email,
      joinedAt: m.created_at,
    }
  })
}

export const unitTenantsQueryKey = (unitId: string) => ['unit-tenants', unitId] as const
