import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchProperty } from './shared'
import type { Property } from './shared'

export const getProperty = cache(async (propertyId: string): Promise<Property> => {
  const supabase = await createClient()
  return fetchProperty(supabase, propertyId)
})
