import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../create-charges'
import { toggleChargeActiveCore } from '../toggle-charge-active'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('toggleChargeActiveCore', () => {
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

    await createChargesCore(client, unitId, [{
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 200000,
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

  it('deactivates an active charge', async () => {
    const result = await toggleChargeActiveCore(client, chargeId, false)
    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('is_active')
      .eq('id', chargeId)
      .single()
    expect(data?.is_active).toBe(false)
  })

  it('reactivates a deactivated charge', async () => {
    const result = await toggleChargeActiveCore(client, chargeId, true)
    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('is_active')
      .eq('id', chargeId)
      .single()
    expect(data?.is_active).toBe(true)
  })
})
