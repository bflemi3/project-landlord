import { describe, it, expect } from 'vitest'
import {
  fetchUnit, unitQueryKey,
  fetchUnitCharges, unitChargesQueryKey,
  fetchUnitTenants, unitTenantsQueryKey,
  fetchUnitInvites, unitInvitesQueryKey,
  fetchUnitStatements, unitStatementsQueryKey,
} from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

// Helper to build a chainable mock that resolves at the terminal method
function mockSupabase(overrides: { data?: unknown; error?: unknown }) {
  const terminal = {
    single: () => Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
    order: () => terminal,
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
  }
  // Make the terminal itself thenable so await works without .single()
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    order: () => chain,
    single: () => Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
  }
  return { from: () => chain } as unknown as TypedSupabaseClient
}

describe('fetchUnit', () => {
  it('maps row to Unit shape', async () => {
    const row = {
      id: 'u1', name: 'Apt A', due_day_of_month: 5,
      pix_key: 'abc', pix_key_type: 'cpf', currency: 'BRL',
    }
    const result = await fetchUnit(mockSupabase({ data: row }), 'u1')
    expect(result).toEqual({
      id: 'u1', name: 'Apt A', dueDay: 5,
      pixKey: 'abc', pixKeyType: 'cpf', currency: 'BRL',
    })
  })

  it('throws on error', async () => {
    await expect(fetchUnit(mockSupabase({ error: { message: 'fail' } }), 'u1'))
      .rejects.toThrow('Unit not found')
  })
})

describe('fetchUnitCharges', () => {
  it('returns empty array on error', async () => {
    const result = await fetchUnitCharges(mockSupabase({ error: { message: 'fail' } }), 'u1')
    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    const result = await fetchUnitCharges(mockSupabase({ data: null }), 'u1')
    expect(result).toEqual([])
  })

  it('maps rows with default split when no allocations', async () => {
    const rows = [{
      id: 'c1', name: 'Rent', charge_type: 'rent',
      amount_minor: 150000, currency: 'BRL', is_active: true,
      responsibility_allocations: [],
    }]
    const result = await fetchUnitCharges(mockSupabase({ data: rows }), 'u1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
    expect(result[0].chargeType).toBe('rent')
    expect(result[0].split.payer).toBe('tenant')
  })
})

describe('fetchUnitTenants', () => {
  it('returns empty array on error', async () => {
    const result = await fetchUnitTenants(mockSupabase({ error: { message: 'fail' } }), 'u1')
    expect(result).toEqual([])
  })

  it('maps rows to UnitTenant shape', async () => {
    const rows = [{
      id: 'm1', user_id: 'uid1', created_at: '2026-01-01',
      profile: { full_name: 'João', email: 'j@test.com' },
    }]
    const result = await fetchUnitTenants(mockSupabase({ data: rows }), 'u1')
    expect(result).toEqual([{
      id: 'm1', userId: 'uid1', name: 'João', email: 'j@test.com', joinedAt: '2026-01-01',
    }])
  })
})

describe('fetchUnitInvites', () => {
  it('returns empty array on error', async () => {
    const result = await fetchUnitInvites(mockSupabase({ error: { message: 'fail' } }), 'u1')
    expect(result).toEqual([])
  })

  it('maps rows to UnitInvite shape', async () => {
    const rows = [{ id: 'i1', invited_email: 'a@b.com', invited_name: 'Ana', updated_at: '2026-02-01' }]
    const result = await fetchUnitInvites(mockSupabase({ data: rows }), 'u1')
    expect(result).toEqual([{ id: 'i1', email: 'a@b.com', name: 'Ana', sentAt: '2026-02-01' }])
  })
})

describe('fetchUnitStatements', () => {
  it('returns empty array on error', async () => {
    const result = await fetchUnitStatements(mockSupabase({ error: { message: 'fail' } }), 'u1')
    expect(result).toEqual([])
  })

  it('maps rows to UnitStatement shape', async () => {
    const rows = [{
      id: 's1', period_year: 2026, period_month: 3, status: 'draft',
      total_amount_minor: 200000, tenant_total_minor: 150000, currency: 'BRL', created_at: '2026-03-01',
    }]
    const result = await fetchUnitStatements(mockSupabase({ data: rows }), 'u1')
    expect(result).toEqual([{
      id: 's1', periodYear: 2026, periodMonth: 3, status: 'draft',
      totalAmountMinor: 200000, tenantTotalMinor: 150000, currency: 'BRL', createdAt: '2026-03-01',
    }])
  })
})

describe('query key functions', () => {
  it('unitQueryKey', () => expect(unitQueryKey('u1')).toEqual(['unit', 'u1']))
  it('unitChargesQueryKey', () => expect(unitChargesQueryKey('u1')).toEqual(['unit-charges', 'u1']))
  it('unitTenantsQueryKey', () => expect(unitTenantsQueryKey('u1')).toEqual(['unit-tenants', 'u1']))
  it('unitInvitesQueryKey', () => expect(unitInvitesQueryKey('u1')).toEqual(['unit-invites', 'u1']))
  it('unitStatementsQueryKey', () => expect(unitStatementsQueryKey('u1')).toEqual(['unit-statements', 'u1']))
})
