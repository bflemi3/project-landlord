import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'

import { fetchMyPropertyRole, type PropertyRole } from './shared'

export const getMyPropertyRole = cache(async (propertyId: string): Promise<PropertyRole | null> => {
  const userId = await getUserId()
  if (!userId) return null
  const supabase = await createClient()
  return fetchMyPropertyRole(supabase, propertyId, userId)
})
