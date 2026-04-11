import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
} from '@/test/supabase'
import { validatePropertyCore } from '../validate-property'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('validatePropertyCore duplicate address check', () => {
  let client: SupabaseClient<any>
  let userId: string
  let propertyId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('reports duplicate when another property has the same address', async () => {
    const result = await validatePropertyCore(client, {
      name: 'Different Name',
      postal_code: '01310100',
      street: 'Rua Teste',
      number: '123',
      complement: '',
      neighborhood: '',
      city: 'Sao Paulo',
      state: 'SP',
      country_code: 'BR',
    })

    expect(result.valid).toBe(false)
    expect(result.errors?.general).toBe('duplicateAddress')
    expect(result.existingPropertyId).toBe(propertyId)
  })

  it('allows saving when excludePropertyId matches the found property (editing self)', async () => {
    const result = await validatePropertyCore(
      client,
      {
        name: 'Updated Name',
        postal_code: '01310100',
        street: 'Rua Teste',
        number: '123',
        complement: '',
        neighborhood: '',
        city: 'Sao Paulo',
        state: 'SP',
        country_code: 'BR',
      },
      propertyId,
    )

    expect(result.valid).toBe(true)
  })
})
