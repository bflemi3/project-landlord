import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../../properties/create-charges'
import { generateAndPersistInstancesCore } from '../generate-instances'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('generateAndPersistInstancesCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string
  let statementId: string
  let periodYear: number
  let periodMonth: number

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId

    const prop = await createTestProperty(client)
    unitId = prop.unitId

    // Seed two charges
    await createChargesCore(client, unitId, [
      {
        name: 'Rent',
        chargeType: 'rent',
        amountMinor: 200000,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
      {
        name: 'Water',
        chargeType: 'variable',
        amountMinor: null,
        payer: 'split',
        splitMode: 'percent',
        tenantPercent: 70,
        landlordPercent: 30,
      },
    ])

    // Use current year/month so the period is after the recurring rule start_date
    // (createChargesCore sets start_date to today)
    const now = new Date()
    periodYear = now.getFullYear()
    periodMonth = now.getMonth() + 1

    // Create a draft statement via admin client to bypass RLS
    const admin = getAdminClient()
    const { data: statement, error } = await admin
      .from('statements')
      .insert({
        unit_id: unitId,
        created_by: userId,
        period_year: periodYear,
        period_month: periodMonth,
        status: 'draft',
        currency: 'BRL',
        total_amount_minor: 0,
        revision: 1,
      })
      .select('id')
      .single()

    if (error || !statement) throw new Error(`Failed to create test statement: ${error?.message}`)
    statementId = statement.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('returns success with instanceCount 1 (skips variable charges with null amount)', async () => {
    const result = await generateAndPersistInstancesCore(
      client,
      unitId,
      statementId,
      periodYear,
      periodMonth,
    )

    expect(result.success).toBe(true)
    expect(result.instanceCount).toBe(1)
  })

  it('persists the rent instance with correct amount and allocation', async () => {
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('*')
      .eq('statement_id', statementId)
      .eq('name', 'Rent')

    expect(instances).toHaveLength(1)
    const rent = instances![0]
    expect(rent.amount_minor).toBe(200000)
    expect(rent.tenant_percentage).toBe(100)
    expect(rent.landlord_percentage).toBeNull()
    expect(rent.split_type).toBe('percentage')
    expect(rent.charge_source).toBe('manual')
  })

  it('does not persist variable charges with null amount', async () => {
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('*')
      .eq('statement_id', statementId)
      .eq('name', 'Water')

    expect(instances).toHaveLength(0)
  })
})
