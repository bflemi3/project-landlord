import { createClient } from '@/lib/supabase/server'
import { fetchUnit, fetchUnitCharges, fetchUnitTenants, fetchUnitInvites, fetchUnitStatements } from './shared'
import type { Unit, ChargeDefinition, UnitTenant, UnitInvite, UnitStatement } from './shared'

export async function getUnit(unitId: string): Promise<Unit> {
  const supabase = await createClient()
  return fetchUnit(supabase, unitId)
}

export async function getUnitCharges(unitId: string): Promise<ChargeDefinition[]> {
  const supabase = await createClient()
  return fetchUnitCharges(supabase, unitId)
}

export async function getUnitTenants(unitId: string): Promise<UnitTenant[]> {
  const supabase = await createClient()
  return fetchUnitTenants(supabase, unitId)
}

export async function getUnitInvites(unitId: string): Promise<UnitInvite[]> {
  const supabase = await createClient()
  return fetchUnitInvites(supabase, unitId)
}

export async function getUnitStatements(unitId: string): Promise<UnitStatement[]> {
  const supabase = await createClient()
  return fetchUnitStatements(supabase, unitId)
}
