import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export type UserProfile = Database['public']['Tables']['profiles']['Row']

export async function fetchProfile(supabase: TypedSupabaseClient): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (error || !data) return null

  return data
}

export const profileQueryKey = () => ['profile'] as const
