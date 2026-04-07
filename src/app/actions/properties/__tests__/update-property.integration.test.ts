import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { updatePropertyCore } from '../update-property'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('updatePropertyCore', () => {
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

  it('updates property name and all address fields', async () => {
    const result = await updatePropertyCore(client, {
      propertyId,
      name: 'Updated Property',
      street: 'Rua Nova',
      number: '456',
      complement: 'Apt 2',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '20040020',
      countryCode: 'BR',
    })

    expect(result.success).toBe(true)

    // Verify via admin client
    const admin = getAdminClient()
    const { data } = await admin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    expect(data?.name).toBe('Updated Property')
    expect(data?.street).toBe('Rua Nova')
    expect(data?.number).toBe('456')
    expect(data?.complement).toBe('Apt 2')
    expect(data?.neighborhood).toBe('Centro')
    expect(data?.city).toBe('Rio de Janeiro')
    expect(data?.state).toBe('RJ')
    expect(data?.postal_code).toBe('20040020')
  })

  it('no-op for non-existent property', async () => {
    const result = await updatePropertyCore(client, {
      propertyId: '00000000-0000-0000-0000-000000000000',
      name: 'Ghost',
      street: 'Nowhere',
      number: '0',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      countryCode: 'BR',
    })

    // RLS silently filters — Supabase returns no error even if 0 rows matched
    expect(result.success).toBe(true)
  })
})
