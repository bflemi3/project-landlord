import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { parseSplit, DEFAULT_SPLIT, type ChargeSplit, type AllocationRow } from '@/lib/split-allocations'

// --- Unit ---

// dueDay is sourced from the unit's active rent row (rent.due_day_of_month).
// `units.due_day_of_month` was dropped during the property-creation persistence
// migration; readers that previously consumed it now fall through to the rent
// row. Returns null when no rent row exists for the unit yet.
export interface Unit {
  id: string
  name: string
  dueDay: number | null
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

  // dueDay derives from the unit's active rent row.
  const { data: rentRow } = await supabase
    .from('rent')
    .select('due_day_of_month')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    id: data.id,
    name: data.name,
    dueDay: rentRow?.due_day_of_month ?? null,
    pixKey: data.pix_key,
    pixKeyType: data.pix_key_type,
    currency: data.currency,
  }
}

export const unitQueryKey = (id: string) => ['unit', id] as const

// --- Unit Charges ---

export type { ChargeSplit }

// `chargeType` is a derived legacy-shape field. The schema now stores
// `expense_type` + `amount_behavior`; rent has its own `rent` table. UI
// components that still want a three-way picker (rent/recurring/variable)
// should be migrated to expense_type + amount_behavior in their own PRs.
//
// Mapping:
//   amount_behavior = 'fixed'    -> chargeType = 'recurring'
//   amount_behavior = 'variable' -> chargeType = 'variable'
//   amount_behavior = 'unknown'  -> chargeType = 'recurring' (default)
// Rent rows do not appear here — they live in the `rent` table.
export interface ChargeDefinition {
  id: string
  name: string
  chargeType: 'recurring' | 'variable'
  expenseType: string
  amountBehavior: 'fixed' | 'variable' | 'unknown'
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
      chargeType: (c.amount_behavior === 'variable' ? 'variable' : 'recurring') as ChargeDefinition['chargeType'],
      expenseType: c.expense_type,
      amountBehavior: c.amount_behavior as ChargeDefinition['amountBehavior'],
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
