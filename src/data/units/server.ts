import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchUnit, fetchUnitCharges, fetchUnitTenants, fetchUnitInvites, fetchUnitStatements } from './shared'
import type { Unit, ChargeDefinition, UnitTenant, UnitInvite, UnitStatement } from './shared'

export const getUnit = cache(async (unitId: string): Promise<Unit> => {
  const supabase = await createClient()
  return fetchUnit(supabase, unitId)
})

export const getUnitCharges = cache(async (unitId: string): Promise<ChargeDefinition[]> => {
  const supabase = await createClient()
  return fetchUnitCharges(supabase, unitId)
})

export const getUnitTenants = cache(async (unitId: string): Promise<UnitTenant[]> => {
  const supabase = await createClient()
  return fetchUnitTenants(supabase, unitId)
})

export const getUnitInvites = cache(async (unitId: string): Promise<UnitInvite[]> => {
  const supabase = await createClient()
  return fetchUnitInvites(supabase, unitId)
})

export const getUnitStatements = cache(async (unitId: string): Promise<UnitStatement[]> => {
  const supabase = await createClient()
  return fetchUnitStatements(supabase, unitId)
})
