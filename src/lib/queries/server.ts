import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchProperty } from './property'
import { fetchStatement } from './statement'
import { fetchUnit } from './unit'

export const getProperty = cache(async (propertyId: string) => {
  const supabase = await createClient()
  return fetchProperty(supabase, propertyId)
})

export const getStatement = cache(async (statementId: string) => {
  const supabase = await createClient()
  return fetchStatement(supabase, statementId)
})

export const getUnit = cache(async (unitId: string) => {
  const supabase = await createClient()
  return fetchUnit(supabase, unitId)
})
