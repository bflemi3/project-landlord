import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { parseSplit, DEFAULT_SPLIT, type ChargeSplit, type AllocationRow } from '@/lib/split-allocations'

// --- Unit ---

// `dueDay` no longer lives on Unit. It moved off `units.due_day_of_month`
// during the property-creation persistence migration and now lives on the
// unit's active rent row. Consumers that need the due day call
// `fetchUnitRent(unitId)` and read `rent.dueDayOfMonth`, or treat the
// missing-rent case explicitly (no fake fallback number).
export interface Unit {
  id: string
  name: string
  pixKey: string | null
  pixKeyType: string | null
  currency: string
}

export async function fetchUnit(supabase: TypedSupabaseClient, unitId: string): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, pix_key, pix_key_type, currency')
    .eq('id', unitId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Unit not found')

  return {
    id: data.id,
    name: data.name,
    pixKey: data.pix_key,
    pixKeyType: data.pix_key_type,
    currency: data.currency,
  }
}

export const unitQueryKey = (id: string) => ['unit', id] as const

// --- Unit Rent (current active row) ---

export interface UnitRent {
  id: string
  amountMinor: number
  currency: string
  dueDayOfMonth: number
  startDate: string | null
  endDate: string | null
  includes: string[] | null
}

/**
 * Fetches the unit's most-recent non-deleted rent row, or null when the unit
 * has no rent set up yet (e.g. a unit mid-creation, or a pre-pivot unit
 * whose data has not been migrated). Callers must handle null explicitly —
 * do not invent a default amount or due day.
 */
export async function fetchUnitRent(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<UnitRent | null> {
  const { data, error } = await supabase
    .from('rent')
    .select('id, amount_minor, currency, due_day_of_month, start_date, end_date, includes')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    amountMinor: data.amount_minor,
    currency: data.currency,
    dueDayOfMonth: data.due_day_of_month,
    startDate: data.start_date,
    endDate: data.end_date,
    includes: data.includes,
  }
}

export const unitRentQueryKey = (unitId: string) => ['unit-rent', unitId] as const

// --- Unit Charges ---

export type { ChargeSplit }

// Charge definitions carry expense_type (semantic kind) and amount_behavior
// (does the amount stay the same each period or vary). Rent rows live in
// the rent table and never appear in charge_definitions.
export type ExpenseType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'condo'
  | 'trash'
  | 'sewer'
  | 'cable'
  | 'insurance'
  | 'maintenance'
  | 'other'

export type AmountBehavior = 'fixed' | 'variable' | 'unknown'

export interface ChargeDefinition {
  id: string
  name: string
  expenseType: ExpenseType
  amountBehavior: AmountBehavior
  amountMinor: number | null
  currency: string
  isActive: boolean
  split: ChargeSplit
}

export async function fetchUnitCharges(supabase: TypedSupabaseClient, unitId: string): Promise<ChargeDefinition[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select(`
      id, name, expense_type, amount_behavior, amount_minor, currency, is_active,
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
      expenseType: c.expense_type as ExpenseType,
      amountBehavior: c.amount_behavior as AmountBehavior,
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
