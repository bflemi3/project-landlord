import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export type PropertyRole = Database['public']['Enums']['user_role']

/**
 * The current user's role on a property, or null if they have no membership
 * (which doubles as the access gate — non-members 404). Scoped to `userId`
 * explicitly so the result is correct regardless of the SELECT policy's reach.
 */
export async function fetchMyPropertyRole(
  supabase: TypedSupabaseClient,
  propertyId: string,
  userId: string,
): Promise<PropertyRole | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (error) throw error
  if (!data?.length) return null

  // A user is normally either landlord or tenant on a rental; if both rows
  // somehow exist, the landlord (management) view wins.
  return data.some((row) => row.role === 'landlord') ? 'landlord' : 'tenant'
}
