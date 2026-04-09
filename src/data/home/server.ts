import { cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchHomeProperties, fetchHomeActions } from './shared'
import type { HomeProperty, HomeAction } from './shared'

export async function getHomeProperties(): Promise<HomeProperty[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchHomeProperties(supabase)
}

export async function getHomeActions(): Promise<HomeAction[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchHomeActions(supabase)
}
