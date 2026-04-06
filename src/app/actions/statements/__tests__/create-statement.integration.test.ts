import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../../properties/create-charges'
import { createStatementCore } from '../create-statement'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('createStatementCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId

    const prop = await createTestProperty(client)
    unitId = prop.unitId

    // Seed charges: rent (fixed) + gas (variable, null amount)
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
        name: 'Gas',
        chargeType: 'variable',
        amountMinor: null,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
    ])
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  const now = new Date()
  const periodYear = now.getFullYear()
  const periodMonth = now.getMonth() + 1

  it('creates a draft statement with charge instances for fixed charges only', async () => {
    const result = await createStatementCore(client, unitId, periodYear, periodMonth)

    expect(result.success).toBe(true)
    expect(result.statementId).toBeDefined()

    // Verify statement row
    const admin = getAdminClient()
    const { data: statement } = await admin
      .from('statements')
      .select('*')
      .eq('id', result.statementId!)
      .single()

    expect(statement).not.toBeNull()
    expect(statement!.status).toBe('draft')
    expect(statement!.period_year).toBe(periodYear)
    expect(statement!.period_month).toBe(periodMonth)
    expect(statement!.revision).toBe(1)

    // Verify only rent instance was generated (gas is variable with null amount)
    const { data: instances } = await admin
      .from('charge_instances')
      .select('name, amount_minor')
      .eq('statement_id', result.statementId!)

    expect(instances).toHaveLength(1)
    expect(instances![0].name).toBe('Rent')
    expect(instances![0].amount_minor).toBe(200000)

    // Verify total was recalculated
    expect(statement!.total_amount_minor).toBe(200000)
  })

  it('rejects duplicate statement for the same period', async () => {
    const result = await createStatementCore(client, unitId, periodYear, periodMonth)

    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })
})
