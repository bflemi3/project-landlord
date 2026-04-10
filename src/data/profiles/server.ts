import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchProfile } from './shared'
import type { UserProfile } from './shared'

/**
 * Request-level cached profile fetch.
 * Multiple components calling getProfile() in the same render
 * share a single DB hit (layout avatar, mobile avatar, greeting).
 */
export const getProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient()
  return fetchProfile(supabase)
})
