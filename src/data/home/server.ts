import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchUserRoles, fetchHomeProperties, fetchHomeActions } from './shared'
import type { UserRole, HomeProperty, HomeAction } from './shared'

export const getUserRoles = cache(async (): Promise<UserRole[]> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string | undefined
  if (!userId) return []
  return fetchUserRoles(supabase, userId)
})

export const getHomeProperties = cache(async (): Promise<HomeProperty[]> => {
  const supabase = await createClient()
  return fetchHomeProperties(supabase)
})

export const getHomeActions = cache(async (): Promise<HomeAction[]> => {
  const supabase = await createClient()
  return fetchHomeActions(supabase)
})
