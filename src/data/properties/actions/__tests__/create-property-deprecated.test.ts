import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  validateProperty: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('../validate-property', () => ({
  validateProperty: mocks.validateProperty,
}))

import { createPropertyDeprecated } from '../create-property-deprecated'

function propertyFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData()
  const values = {
    name: '',
    postal_code: '01310-100',
    street: 'Rua Augusta',
    number: '123',
    complement: '',
    neighborhood: 'Consolação',
    city: 'São Paulo',
    state: 'SP',
    country_code: 'BR',
    property_type: 'apartment',
    due_day: '15',
    ...overrides,
  }

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}

describe('createPropertyDeprecated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc })
    mocks.rpc.mockResolvedValue({
      data: { property_id: 'property-1', unit_id: 'unit-1' },
      error: null,
    })
    mocks.validateProperty.mockResolvedValue({ valid: true })
  })

  it('returns schema field errors without calling validation or Supabase for invalid FormData', async () => {
    const result = await createPropertyDeprecated(
      { success: false },
      propertyFormData({
        postal_code: '',
        street: '',
        number: '',
        city: '',
        state: '',
        property_type: 'condo',
      }),
    )

    expect(result).toEqual({
      success: false,
      errors: {
        postal_code: ['required'],
        street: ['required'],
        number: ['required'],
        city: ['required'],
        state: ['required'],
        property_type: ['invalidPropertyType'],
      },
    })
    expect(mocks.validateProperty).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('validates normalized FormData and creates the property with parsed fields', async () => {
    const result = await createPropertyDeprecated(
      { success: false },
      propertyFormData({
        name: ' <strong>Casa Centro</strong> ',
        street: ' <b>Rua Augusta</b> ',
        number: ' 123 ',
        complement: ' Apto 4 ',
      }),
    )

    expect(mocks.validateProperty).toHaveBeenCalledWith({
      name: 'Casa Centro',
      postal_code: '01310-100',
      street: 'Rua Augusta',
      number: '123',
      complement: 'Apto 4',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      country_code: 'BR',
      property_type: 'apartment',
    })
    expect(mocks.rpc).toHaveBeenCalledWith('create_property_with_membership', {
      p_name: 'Casa Centro',
      p_street: 'Rua Augusta',
      p_number: '123',
      p_complement: 'Apto 4',
      p_neighborhood: 'Consolação',
      p_city: 'São Paulo',
      p_state: 'SP',
      p_postal_code: '01310-100',
      p_country_code: 'BR',
      p_due_day: 15,
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/app')
    expect(result).toEqual({ success: true, propertyId: 'property-1', unitId: 'unit-1' })
  })

  it('returns business validation errors before creating the property', async () => {
    mocks.validateProperty.mockResolvedValueOnce({
      valid: false,
      errors: { general: ['duplicateAddress'] },
    })

    const result = await createPropertyDeprecated({ success: false }, propertyFormData())

    expect(result).toEqual({ success: false, errors: { general: ['duplicateAddress'] } })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
