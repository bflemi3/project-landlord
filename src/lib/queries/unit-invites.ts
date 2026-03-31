import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface UnitInvite {
  id: string
  email: string
  name: string | null
  sentAt: string
}

export async function fetchUnitInvites(supabase: TypedSupabaseClient, unitId: string): Promise<UnitInvite[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, invited_email, invited_name, updated_at')
    .eq('unit_id', unitId)
    .eq('role', 'tenant')
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data.map((inv) => ({
    id: inv.id,
    email: inv.invited_email,
    name: inv.invited_name,
    sentAt: inv.updated_at,
  }))
}

export const unitInvitesQueryKey = (unitId: string) => ['unit-invites', unitId] as const
