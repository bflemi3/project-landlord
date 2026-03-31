import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { validateCharge, createChargesCore } from '../create-charges'
import type { ChargeInput } from '../create-charges'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('validateCharge', () => {
  it('rejects due day below 1', async () => {
    const result = await validateCharge({
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 100000,
      dueDay: 0,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })
    expect(result).toContain('Invalid due day')
  })

  it('rejects due day above 28', async () => {
    const result = await validateCharge({
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 100000,
      dueDay: 29,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })
    expect(result).toContain('Invalid due day')
  })

  it('rejects non-positive fixed amount', async () => {
    const result = await validateCharge({
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: -500,
      dueDay: 10,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })
    expect(result).toContain('must be positive')
  })

  it('allows null amount for variable charges', async () => {
    const result = await validateCharge({
      name: 'Water',
      chargeType: 'variable',
      amountMinor: null,
      dueDay: 15,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })
    expect(result).toBeNull()
  })

  it('allows valid fixed charge', async () => {
    const result = await validateCharge({
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 200000,
      dueDay: 5,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    })
    expect(result).toBeNull()
  })
})

describe('createChargesCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('creates charge definition + recurring rule + allocation for a tenant-pays charge', async () => {
    const charges: ChargeInput[] = [
      {
        name: 'Rent',
        chargeType: 'rent',
        amountMinor: 200000,
        dueDay: 5,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
    ]

    const result = await createChargesCore(client, unitId, charges)
    expect(result.success).toBe(true)
    expect(result.failedCharges).toHaveLength(0)

    // Verify charge definition
    const admin = getAdminClient()
    const { data: chargeDefs } = await admin
      .from('charge_definitions')
      .select('*')
      .eq('unit_id', unitId)
      .eq('name', 'Rent')

    expect(chargeDefs).toHaveLength(1)
    expect(chargeDefs![0].charge_type).toBe('rent')
    expect(chargeDefs![0].amount_minor).toBe(200000)
    expect(chargeDefs![0].currency).toBe('BRL')

    // Verify recurring rule
    const { data: rules } = await admin
      .from('recurring_rules')
      .select('*')
      .eq('charge_definition_id', chargeDefs![0].id)

    expect(rules).toHaveLength(1)
    expect(rules![0].day_of_month).toBe(5)

    // Verify allocation
    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('*')
      .eq('charge_definition_id', chargeDefs![0].id)

    expect(allocs).toHaveLength(1)
    expect(allocs![0].role).toBe('tenant')
    expect(allocs![0].allocation_type).toBe('percentage')
    expect(allocs![0].percentage).toBe(100)
  })

  it('creates split charge with two allocations (tenant 70% + landlord 30%)', async () => {
    const charges: ChargeInput[] = [
      {
        name: 'Electric',
        chargeType: 'recurring',
        amountMinor: 30000,
        dueDay: 10,
        payer: 'split',
        splitMode: 'percent',
        tenantPercent: 70,
        landlordPercent: 30,
      },
    ]

    const result = await createChargesCore(client, unitId, charges)
    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: chargeDefs } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Electric')

    expect(chargeDefs).toHaveLength(1)

    const { data: allocs } = await admin
      .from('responsibility_allocations')
      .select('*')
      .eq('charge_definition_id', chargeDefs![0].id)
      .order('role')

    expect(allocs).toHaveLength(2)

    const landlordAlloc = allocs!.find((a) => a.role === 'landlord')
    const tenantAlloc = allocs!.find((a) => a.role === 'tenant')

    expect(landlordAlloc?.percentage).toBe(30)
    expect(tenantAlloc?.percentage).toBe(70)
  })

  it('returns empty success for no charges', async () => {
    const result = await createChargesCore(client, unitId, [])
    expect(result.success).toBe(true)
    expect(result.failedCharges).toHaveLength(0)
  })

  it('reports validation failures in failedCharges without stopping other charges', async () => {
    const charges: ChargeInput[] = [
      {
        name: 'Bad Charge',
        chargeType: 'rent',
        amountMinor: 100000,
        dueDay: 0, // invalid
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
      {
        name: 'Good Charge',
        chargeType: 'recurring',
        amountMinor: 5000,
        dueDay: 15,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
    ]

    const result = await createChargesCore(client, unitId, charges)
    expect(result.success).toBe(false)
    expect(result.failedCharges).toContain('Bad Charge')
    expect(result.failedCharges).not.toContain('Good Charge')

    // Good charge was still created
    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Good Charge')

    expect(data).toHaveLength(1)
  })
})
