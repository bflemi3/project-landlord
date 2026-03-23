'use server'

import { createClient } from '@/lib/supabase/server'

export interface CreatePropertyState {
  success: boolean
  propertyId?: string
  errors?: {
    name?: string
    city?: string
    postal_code?: string
    general?: string
  }
}

export async function createProperty(
  _prevState: CreatePropertyState,
  formData: FormData,
): Promise<CreatePropertyState> {
  const name = (formData.get('name') as string)?.trim()
  const street = (formData.get('street') as string)?.trim() || null
  const number = (formData.get('number') as string)?.trim() || null
  const complement = (formData.get('complement') as string)?.trim() || null
  const neighborhood = (formData.get('neighborhood') as string)?.trim() || null
  const city = (formData.get('city') as string)?.trim() || null
  const state = (formData.get('state') as string)?.trim() || null
  const postalCode = (formData.get('postal_code') as string)?.trim() || null
  const countryCode = (formData.get('country_code') as string)?.trim() || 'BR'
  const currency = (formData.get('currency') as string)?.trim() || 'BRL'

  // Validate required fields
  const errors: CreatePropertyState['errors'] = {}
  if (!name) errors.name = 'required'
  if (!city) errors.city = 'required'

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_property_with_membership', {
    p_name: name,
    p_street: street,
    p_number: number,
    p_complement: complement,
    p_neighborhood: neighborhood,
    p_city: city,
    p_state: state,
    p_postal_code: postalCode,
    p_country_code: countryCode,
    p_currency: currency,
  })

  if (error) {
    return { success: false, errors: { general: 'createFailed' } }
  }

  return { success: true, propertyId: data as string }
}
