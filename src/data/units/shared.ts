import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { parseSplit, DEFAULT_SPLIT, type ChargeSplit, type AllocationRow } from '@/lib/split-allocations'

// --- Unit ---

export interface Unit {
  id: string
  name: string
  dueDay: number
  pixKey: string | null
  pixKeyType: string | null
  currency: string
}

export async function fetchUnit(supabase: TypedSupabaseClient, unitId: string): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, due_day_of_month, pix_key, pix_key_type, currency')
    .eq('id', unitId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Unit not found')

  return {
    id: data.id,
    name: data.name,
    dueDay: data.due_day_of_month,
    pixKey: data.pix_key,
    pixKeyType: data.pix_key_type,
    currency: data.currency,
  }
}

export const unitQueryKey = (id: string) => ['unit', id] as const

// --- Unit Charges ---

export type { ChargeSplit }

export interface ChargeDefinition {
  id: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  currency: string
  isActive: boolean
  split: ChargeSplit
}

export async function fetchUnitCharges(supabase: TypedSupabaseClient, unitId: string): Promise<ChargeDefinition[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select(`
      id, name, charge_type, amount_minor, currency, is_active,
      responsibility_allocations ( role, allocation_type, percentage, fixed_minor )
    `)
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at')

  if (error || !data) return []

  return data.map((c) => {
    const allocations = (c.responsibility_allocations ?? []) as unknown as AllocationRow[]
    return {
      id: c.id,
      name: c.name,
      chargeType: c.charge_type as ChargeDefinition['chargeType'],
      amountMinor: c.amount_minor,
      currency: c.currency,
      isActive: c.is_active,
      split: allocations.length > 0 ? parseSplit(allocations) : DEFAULT_SPLIT,
    }
  })
}

export const unitChargesQueryKey = (unitId: string) => ['unit-charges', unitId] as const

// --- Unit Tenants ---

export interface UnitTenant {
  id: string
  userId: string
  name: string | null
  email: string | null
  joinedAt: string
}

export async function fetchUnitTenants(supabase: TypedSupabaseClient, unitId: string): Promise<UnitTenant[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      created_at,
      profile:profiles!inner ( full_name, email )
    `)
    .eq('unit_id', unitId)
    .eq('role', 'tenant')
    .is('deleted_at', null)

  if (error || !data) return []

  return data.map((m) => {
    const profile = m.profile as unknown as { full_name: string | null; email: string | null }
    return {
      id: m.id,
      userId: m.user_id,
      name: profile.full_name,
      email: profile.email,
      joinedAt: m.created_at,
    }
  })
}

export const unitTenantsQueryKey = (unitId: string) => ['unit-tenants', unitId] as const

// --- Unit Invites ---

export interface UnitInvite {
  id: string
  email: string
  name: string | null
  sentAt: string
}

export async function fetchUnitInvites(supabase: TypedSupabaseClient, unitId: string): Promise<UnitInvite[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, invited_email, invited_name, updated_at')
    .eq('unit_id', unitId)
    .eq('role', 'tenant')
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data.map((inv) => ({
    id: inv.id,
    email: inv.invited_email,
    name: inv.invited_name,
    sentAt: inv.updated_at,
  }))
}

export const unitInvitesQueryKey = (unitId: string) => ['unit-invites', unitId] as const

// --- Unit Statements ---

export interface UnitStatement {
  id: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  tenantTotalMinor: number
  currency: string
  createdAt: string
}

export async function fetchUnitStatements(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<UnitStatement[]> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, period_year, period_month, status, total_amount_minor, tenant_total_minor, currency, created_at')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    status: row.status as UnitStatement['status'],
    totalAmountMinor: row.total_amount_minor,
    tenantTotalMinor: row.tenant_total_minor,
    currency: row.currency,
    createdAt: row.created_at,
  }))
}

export const unitStatementsQueryKey = (unitId: string) => ['unit-statements', unitId] as const
