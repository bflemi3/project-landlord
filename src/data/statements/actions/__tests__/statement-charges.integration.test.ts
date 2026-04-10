import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../../properties/create-charges'
import { createStatementCore } from '../create-statement'
import { addChargeToStatementCore } from '../add-charge'
import { updateChargeInstanceCore } from '../update-charge-instance'
import { removeChargeInstanceCore } from '../remove-charge-instance'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('statement charge mutations', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string
  let statementId: string
  let chargeDefId: string

  const now = new Date()
  const periodYear = now.getFullYear()
  // Use a different month than create-statement tests to avoid conflicts
  const periodMonth = now.getMonth() === 12 ? 1 : now.getMonth() + 1

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId

    const prop = await createTestProperty(client)
    unitId = prop.unitId

    // Seed a variable charge definition (for testing add with definition)
    await createChargesCore(client, unitId, [
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

    // Get the charge definition ID
    const admin = getAdminClient()
    const { data: defs } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Water')

    chargeDefId = defs![0].id

    // Create a statement
    const result = await createStatementCore(client, unitId, periodYear, periodMonth)
    statementId = result.statementId!
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('adds a manual charge and recalculates total', async () => {
    const result = await addChargeToStatementCore(client, {
      statementId,
      name: 'Repair fee',
      amountMinor: 15000,
    })

    expect(result.success).toBe(true)
    expect(result.chargeInstanceId).toBeDefined()

    // Verify total was recalculated
    const admin = getAdminClient()
    const { data: statement } = await admin
      .from('statements')
      .select('total_amount_minor')
      .eq('id', statementId)
      .single()

    expect(statement!.total_amount_minor).toBe(15000)
  })

  it('adds a charge with definition and copies split fields', async () => {
    const result = await addChargeToStatementCore(client, {
      statementId,
      name: 'Water',
      amountMinor: 8500,
      chargeDefinitionId: chargeDefId,
    })

    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data: instance } = await admin
      .from('charge_instances')
      .select('tenant_percentage, landlord_percentage, split_type')
      .eq('id', result.chargeInstanceId!)
      .single()

    expect(instance!.split_type).toBe('percentage')
    expect(instance!.tenant_percentage).toBe(70)
    expect(instance!.landlord_percentage).toBe(30)
  })

  it('updates charge amount and recalculates total', async () => {
    // Get an instance to update
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('id')
      .eq('statement_id', statementId)
      .eq('name', 'Repair fee')

    const instanceId = instances![0].id

    const result = await updateChargeInstanceCore(client, {
      instanceId,
      amountMinor: 20000,
    })

    expect(result.success).toBe(true)

    // Verify total was recalculated (20000 repair + 8500 water)
    const { data: statement } = await admin
      .from('statements')
      .select('total_amount_minor')
      .eq('id', statementId)
      .single()

    expect(statement!.total_amount_minor).toBe(28500)
  })

  it('removes a manual charge and recalculates total', async () => {
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('id')
      .eq('statement_id', statementId)
      .eq('name', 'Repair fee')

    const result = await removeChargeInstanceCore(client, instances![0].id)
    expect(result.success).toBe(true)

    // Verify total (only water 8500 remains)
    const { data: statement } = await admin
      .from('statements')
      .select('total_amount_minor')
      .eq('id', statementId)
      .single()

    expect(statement!.total_amount_minor).toBe(8500)
  })

  it('rejects removing a definition-linked charge', async () => {
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('id')
      .eq('statement_id', statementId)
      .eq('name', 'Water')

    const result = await removeChargeInstanceCore(client, instances![0].id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('definition-generated')
  })
})
