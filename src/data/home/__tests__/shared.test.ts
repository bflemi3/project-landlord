import { describe, it, expect, vi } from 'vitest'
import { fetchHomeProperties, fetchHomeActions, homePropertiesQueryKey, homeActionsQueryKey } from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

function mockSupabase(overrides: { data?: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => Promise.resolve({
        data: overrides.data ?? null,
        error: overrides.error ?? null,
      }),
    }),
  } as unknown as TypedSupabaseClient
}

describe('fetchHomeProperties', () => {
  it('maps rows to HomeProperty shape', async () => {
    const rows = [
      {
        property_id: 'p1',
        name: 'Casa Verde',
        city: 'São Paulo',
        state: 'SP',
        role: 'landlord',
        unit_count: 2,
        tenant_count: 1,
        charge_count: 3,
        pending_invite_count: 0,
      },
    ]
    const result = await fetchHomeProperties(mockSupabase({ data: rows }))
    expect(result).toEqual([
      {
        propertyId: 'p1',
        name: 'Casa Verde',
        city: 'São Paulo',
        state: 'SP',
        role: 'landlord',
        unitCount: 2,
        tenantCount: 1,
        chargeCount: 3,
        pendingInviteCount: 0,
      },
    ])
  })

  it('returns empty array on error', async () => {
    const result = await fetchHomeProperties(mockSupabase({ error: { message: 'fail' } }))
    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    const result = await fetchHomeProperties(mockSupabase({ data: null }))
    expect(result).toEqual([])
  })

  it('defaults numeric fields to 0 when null', async () => {
    const rows = [
      {
        property_id: 'p2',
        name: 'Apt B',
        city: null,
        state: null,
        role: 'tenant',
        unit_count: null,
        tenant_count: null,
        charge_count: null,
        pending_invite_count: null,
      },
    ]
    const result = await fetchHomeProperties(mockSupabase({ data: rows }))
    expect(result[0].unitCount).toBe(0)
    expect(result[0].tenantCount).toBe(0)
    expect(result[0].chargeCount).toBe(0)
    expect(result[0].pendingInviteCount).toBe(0)
  })
})

describe('fetchHomeActions', () => {
  it('maps rows to HomeAction shape', async () => {
    const rows = [
      {
        action_type: 'invite_tenants',
        property_id: 'p1',
        property_name: 'Casa Verde',
        detail_id: null,
        detail_name: null,
        detail_email: null,
        detail_date: null,
      },
    ]
    const result = await fetchHomeActions(mockSupabase({ data: rows }))
    expect(result).toEqual([
      {
        actionType: 'invite_tenants',
        propertyId: 'p1',
        propertyName: 'Casa Verde',
        detailId: null,
        detailName: null,
        detailEmail: null,
        detailDate: null,
      },
    ])
  })

  it('returns empty array on error', async () => {
    const result = await fetchHomeActions(mockSupabase({ error: { message: 'fail' } }))
    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    const result = await fetchHomeActions(mockSupabase({ data: null }))
    expect(result).toEqual([])
  })
})

describe('query key functions', () => {
  it('homePropertiesQueryKey returns stable key', () => {
    expect(homePropertiesQueryKey()).toEqual(['home-properties'])
  })

  it('homeActionsQueryKey returns stable key', () => {
    expect(homeActionsQueryKey()).toEqual(['home-actions'])
  })
})
