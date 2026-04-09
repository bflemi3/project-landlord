import { cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchProperty } from './shared'
import type { Property } from './shared'

export async function getProperty(propertyId: string): Promise<Property> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchProperty(supabase, propertyId)
}
