import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

import { fetchProperty, type Property } from './shared'

export const getProperty = cache(async (propertyId: string): Promise<Property | null> => {
  const supabase = await createClient()
  return fetchProperty(supabase, propertyId)
})
