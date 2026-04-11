import type { TypedSupabaseClient } from '@/lib/supabase/types'

// --- User Roles (router query) ---

export type UserRole = 'landlord' | 'tenant'

export async function fetchUserRoles(supabase: TypedSupabaseClient, userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (error || !data) return []

  const roles = [...new Set(data.map((row) => row.role as UserRole))]
  return roles
}

// --- Home Properties ---

export interface HomeProperty {
  propertyId: string
  name: string
  city: string | null
  state: string | null
  role: 'landlord' | 'tenant'
  unitCount: number
  tenantCount: number
  chargeCount: number
  pendingInviteCount: number
}

export async function fetchHomeProperties(supabase: TypedSupabaseClient): Promise<HomeProperty[]> {
  const { data, error } = await supabase
    .from('home_properties')
    .select('property_id, name, city, state, role, unit_count, tenant_count, charge_count, pending_invite_count')

  if (error || !data) return []

  return data.map((row) => ({
    propertyId: row.property_id!,
    name: row.name!,
    city: row.city,
    state: row.state,
    role: row.role as 'landlord' | 'tenant',
    unitCount: row.unit_count ?? 0,
    tenantCount: row.tenant_count ?? 0,
    chargeCount: row.charge_count ?? 0,
    pendingInviteCount: row.pending_invite_count ?? 0,
  }))
}

export const homePropertiesQueryKey = () => ['home-properties'] as const

// --- Home Actions ---

export interface HomeAction {
  actionType: 'invite_tenants' | 'configure_charges' | 'pending_invite' | 'generate_statement'
  propertyId: string
  propertyName: string
  detailId: string | null
  detailName: string | null
  detailEmail: string | null
  detailDate: string | null
}

export async function fetchHomeActions(supabase: TypedSupabaseClient): Promise<HomeAction[]> {
  const { data, error } = await supabase
    .from('home_action_items')
    .select('action_type, property_id, property_name, detail_id, detail_name, detail_email, detail_date')

  if (error || !data) return []

  return data.map((row) => ({
    actionType: row.action_type as HomeAction['actionType'],
    propertyId: row.property_id ?? '',
    propertyName: row.property_name ?? '',
    detailId: (row as Record<string, unknown>).detail_id as string | null,
    detailName: row.detail_name,
    detailEmail: row.detail_email,
    detailDate: row.detail_date,
  }))
}

export const homeActionsQueryKey = () => ['home-actions'] as const
