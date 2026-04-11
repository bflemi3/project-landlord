import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchProperty } from '@/data/properties/shared'
import { fetchStatement } from '@/data/statements/shared'
import { fetchUnit } from '@/data/units/shared'

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
