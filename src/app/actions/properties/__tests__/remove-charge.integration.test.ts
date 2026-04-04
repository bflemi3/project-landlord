import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../create-charges'
import { removeChargeCore } from '../remove-charge'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('removeChargeCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let propertyId: string
  let unitId: string
  let chargeId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
    unitId = prop.unitId

    // Create a charge to delete
    await createChargesCore(client, unitId, [
      {
        name: 'Deletable Charge',
        chargeType: 'recurring',
        amountMinor: 5000,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
    ])

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Deletable Charge')
      .single()

    chargeId = data!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('soft-deletes charge (row still exists with deleted_at set)', async () => {
    const result = await removeChargeCore(client, chargeId)
    expect(result.success).toBe(true)

    // Verify via admin — row still exists but has deleted_at
    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('*')
      .eq('id', chargeId)
      .single()

    expect(data).not.toBeNull()
    expect(data?.deleted_at).not.toBeNull()
  })
})
