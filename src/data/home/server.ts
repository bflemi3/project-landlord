import { createClient } from '@/lib/supabase/server'
import { fetchUserRoles, fetchHomeProperties, fetchHomeActions } from './shared'
import type { UserRole, HomeProperty, HomeAction } from './shared'

export async function getUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient()
  return fetchUserRoles(supabase)
}

export async function getHomeProperties(): Promise<HomeProperty[]> {
  const supabase = await createClient()
  return fetchHomeProperties(supabase)
}

export async function getHomeActions(): Promise<HomeAction[]> {
  const supabase = await createClient()
  return fetchHomeActions(supabase)
}
