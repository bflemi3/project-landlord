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
  let propertyId: string
  let unitId: string
  let tenantChargeId: string
  let splitChargeId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
    unitId = prop.unitId

    // Seed a tenant-pays charge
    await createChargesCore(client, unitId, [
      {
        name: 'Tenant Charge',
        chargeType: 'rent',
        amountMinor: 150000,
        dueDay: 10,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
    ])

    // Seed a split charge (both allocations exist)
    await createChargesCore(client, unitId, [
      {
        name: 'Split Charge',
        chargeType: 'recurring',
        amountMinor: 30000,
        dueDay: 15,
        payer: 'split',
        splitMode: 'percent',
        tenantPercent: 60,
        landlordPercent: 40,
      },
    ])

    const admin = getAdminClient()
    const { data: tenantCharge } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Tenant Charge')
      .single()
    tenantChargeId = tenantCharge!.id

    const { data: splitCharge } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Split Charge')
      .single()
    splitChargeId = splitCharge!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('updates charge name, amount, and due day', async () => {
    const result = await updateChargeCore(client, {
      chargeId: tenantChargeId,
      name: 'Updated Charge',
      chargeType: 'rent',
      amountMinor: 180000,
      dueDay: 20,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: charge } = await admin
      .from('charge_definitions')
      .select('*')
      .eq('id', tenantChargeId)
      .single()

    expect(charge?.name).toBe('Updated Charge')
    expect(charge?.amount_minor).toBe(180000)

    const { data: rule } = await admin
      .from('recurring_rules')
      .select('*')
      .eq('charge_definition_id', tenantChargeId)
      .single()

    expect(rule?.day_of_month).toBe(20)
  })

  it('switches from split to single payer (updates landlord allocation to 100%)', async () => {
    // splitChargeId currently has both tenant and landlord allocations
    const result = await updateChargeCore(client, {
      chargeId: splitChargeId,
      name: 'Split Charge',
      chargeType: 'recurring',
      amountMinor: 30000,
      dueDay: 15,
      payer: 'landlord',
      tenantPercent: 0,
      landlordPercent: 100,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('*')
      .eq('charge_definition_id', splitChargeId)
      .order('role')

    // The landlord allocation is updated to 100%
    const landlordAlloc = allocs!.find((a) => a.role === 'landlord')
    expect(landlordAlloc).toBeDefined()
    expect(landlordAlloc?.percentage).toBe(100)
  })

  it('updates split percentages when both allocations exist', async () => {
    // First, re-create a split charge with both allocations for this test
    await createChargesCore(client, unitId, [
      {
        name: 'Pct Charge',
        chargeType: 'recurring',
        amountMinor: 20000,
        dueDay: 12,
        payer: 'split',
        splitMode: 'percent',
        tenantPercent: 50,
        landlordPercent: 50,
      },
    ])

    const admin = getAdminClient()
    const { data: cd } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Pct Charge')
      .single()

    const pctChargeId = cd!.id

    // Update to 70/30
    const result = await updateChargeCore(client, {
      chargeId: pctChargeId,
      name: 'Pct Charge',
      chargeType: 'recurring',
      amountMinor: 20000,
      dueDay: 12,
      payer: 'split',
      splitMode: 'percent',
      tenantPercent: 70,
      landlordPercent: 30,
    })

    expect(result.success).toBe(true)

    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('*')
      .eq('charge_definition_id', pctChargeId)
      .order('role')

    expect(allocs).toHaveLength(2)

    const landlordAlloc = allocs!.find((a) => a.role === 'landlord')
    const tenantAlloc = allocs!.find((a) => a.role === 'tenant')

    expect(landlordAlloc?.percentage).toBe(30)
    expect(tenantAlloc?.percentage).toBe(70)
  })
})
