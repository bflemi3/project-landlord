import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'
import { fetchUserRoles, fetchHomeProperties, fetchHomeActions } from './shared'
import type { UserRole, HomeProperty, HomeAction } from './shared'

export const getUserRoles = cache(async (): Promise<UserRole[]> => {
  const userId = await getUserId()
  if (!userId) return []
  const supabase = await createClient()
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
