import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchUserRoles, fetchHomeProperties, fetchHomeActions } from './shared'
import type { UserRole, HomeProperty, HomeAction } from './shared'

export const getUserRoles = cache(async (): Promise<UserRole[]> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return fetchUserRoles(supabase, user.id)
})

export const getHomeProperties = cache(async (): Promise<HomeProperty[]> => {
  const supabase = await createClient()
  return fetchHomeProperties(supabase)
})

export const getHomeActions = cache(async (): Promise<HomeAction[]> => {
  const supabase = await createClient()
  return fetchHomeActions(supabase)
})
