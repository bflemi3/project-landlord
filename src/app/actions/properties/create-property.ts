'use server'

import { createClient } from '@/lib/supabase/server'
import { validateProperty, parsePropertyFormData } from './validate-property'
import { formatPropertyName } from '@/lib/address/format-property-name'

export interface CreatePropertyState {
  success: boolean
  propertyId?: string
  unitId?: string
  errors?: {
    name?: string
    postal_code?: string
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    general?: string
  }
}

export async function createProperty(
  _prevState: CreatePropertyState,
  formData: FormData,
): Promise<CreatePropertyState> {
  const fields = await parsePropertyFormData(formData)
  const validation = await validateProperty(fields)

  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const supabase = await createClient()

  const name = formatPropertyName({
    name: fields.name,
    street: fields.street,
    number: fields.number,
    complement: fields.complement,
    countryCode: fields.country_code,
  })

  const dueDay = Number(formData.get('due_day')) || 10

  const { data, error } = await supabase.rpc('create_property_with_membership', {
    p_name: name,
    p_street: fields.street || null,
    p_number: fields.number || null,
    p_complement: fields.complement || null,
    p_neighborhood: fields.neighborhood || null,
    p_city: fields.city || null,
    p_state: fields.state || null,
    p_postal_code: fields.postal_code || null,
    p_country_code: fields.country_code,
    p_due_day: dueDay,
  })

  if (error) {
    return { success: false, errors: { general: 'createFailed' } }
  }

  const result = data as { property_id: string; unit_id: string }
  return { success: true, propertyId: result.property_id, unitId: result.unit_id }
}
