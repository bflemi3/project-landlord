import { createClient } from '@/lib/supabase/server'
import { fetchProfile } from './shared'
import type { UserProfile } from './shared'

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  return fetchProfile(supabase)
}
