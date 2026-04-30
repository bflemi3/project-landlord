import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
} from '@/test/supabase'
import { validatePropertyCore } from '../validate-property'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PropertyInput } from '@/data/properties/schema'

function validPropertyInput(overrides: Partial<PropertyInput> = {}): PropertyInput {
  return {
    name: 'Different Name',
    postal_code: '01310100',
    street: 'Rua Teste',
    number: '123',
    complement: '',
    neighborhood: '',
    city: 'Sao Paulo',
    state: 'SP',
    country_code: 'BR',
    property_type: null,
    ...overrides,
  }
}

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
    const result = await validatePropertyCore(client, validPropertyInput())

    expect(result.valid).toBe(false)
    expect(result.errors?.general).toEqual(['duplicateAddress'])
    expect(result.existingPropertyId).toBe(propertyId)
  })

  it('returns provider address errors before duplicate address errors', async () => {
    const result = await validatePropertyCore(
      client,
      validPropertyInput({ postal_code: '123' }),
    )

    expect(result.valid).toBe(false)
    expect(result.errors?.postal_code).toEqual(['invalidPostalCode'])
    expect(result.errors?.general).toBeUndefined()
    expect(result.existingPropertyId).toBeUndefined()
  })

  it('allows saving when excludePropertyId matches the found property (editing self)', async () => {
    const result = await validatePropertyCore(
      client,
      validPropertyInput({
        name: 'Updated Name',
      }),
      propertyId,
    )

    expect(result.valid).toBe(true)
  })
})
