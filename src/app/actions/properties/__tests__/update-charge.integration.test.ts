import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../create-charges'
import { updateChargeCore } from '../update-charge'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('updateChargeCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string
  let chargeId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    unitId = prop.unitId

    // Seed a tenant-pays charge
    await createChargesCore(client, unitId, [{
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 200000,
      dueDay: 10,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    }])

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Rent')
      .single()
    chargeId = data!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('updates charge name, amount, and due day', async () => {
    const result = await updateChargeCore(client, {
      chargeId,
      name: 'Updated Rent',
      chargeType: 'rent',
      amountMinor: 250000,
      dueDay: 15,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: charge } = await admin
      .from('charge_definitions')
      .select('name, amount_minor')
      .eq('id', chargeId)
      .single()

    expect(charge?.name).toBe('Updated Rent')
    expect(charge?.amount_minor).toBe(250000)

    const { data: rule } = await admin
      .from('recurring_rules')
      .select('day_of_month')
      .eq('charge_definition_id', chargeId)
      .single()

    expect(rule?.day_of_month).toBe(15)
  })

  it('switches from single payer to split', async () => {
    // Currently tenant-pays (1 allocation). Switch to 60/40 split.
    const result = await updateChargeCore(client, {
      chargeId,
      name: 'Updated Rent',
      chargeType: 'rent',
      amountMinor: 250000,
      dueDay: 15,
      payer: 'split',
      splitMode: 'percent',
      tenantPercent: 60,
      landlordPercent: 40,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('role, percentage')
      .eq('charge_definition_id', chargeId)
      .order('role')

    expect(allocs).toHaveLength(2)
    expect(allocs![0]).toMatchObject({ role: 'landlord', percentage: 40 })
    expect(allocs![1]).toMatchObject({ role: 'tenant', percentage: 60 })
  })

  it('switches from split back to single payer', async () => {
    // Currently split (2 allocations). Switch to landlord-pays.
    const result = await updateChargeCore(client, {
      chargeId,
      name: 'Updated Rent',
      chargeType: 'rent',
      amountMinor: 250000,
      dueDay: 15,
      payer: 'landlord',
      tenantPercent: 0,
      landlordPercent: 100,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('role, percentage')
      .eq('charge_definition_id', chargeId)

    expect(allocs).toHaveLength(1)
    expect(allocs![0]).toMatchObject({ role: 'landlord', percentage: 100 })
  })

  it('audit trail captures allocation changes', async () => {
    const admin = getAdminClient()
    const { data: events } = await admin
      .from('audit_events')
      .select('action, entity_type')
      .eq('entity_type', 'responsibility_allocations')
      .order('created_at', { ascending: false })
      .limit(5)

    // Should have delete + create events from the payer switches above
    const actions = events?.map((e) => e.action) ?? []
    expect(actions).toContain('delete')
    expect(actions).toContain('create')
  })
})
