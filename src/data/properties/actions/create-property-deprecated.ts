'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getPropertyInputFormDataSchema } from '@/schemas/property'
import { validateProperty, type ValidatePropertyState } from './validate-property'
import { formatPropertyName } from '@/lib/address/format-property-name'

/**
 * Deprecated FormData-based property creator from the pre-wizard era.
 * Superseded by `createProperty` in `./create-property.ts` (Phase 3 wizard
 * submit). Kept compiling until callers migrate off; new code should use
 * the wizard action instead.
 */
export interface CreatePropertyDeprecatedState {
  success: boolean
  propertyId?: string
  unitId?: string
  errors?: ValidatePropertyState['errors']
}

export async function createPropertyDeprecated(
  _prevState: CreatePropertyDeprecatedState,
  formData: FormData,
): Promise<CreatePropertyDeprecatedState> {
  const country = (formData.get('country_code') as string) || 'BR'
  const parsed = getPropertyInputFormDataSchema(country).safeParse(formData)
  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors as ValidatePropertyState['errors'],
    }
  }

  const validation = await validateProperty(parsed.data)

  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const fields = validation.fields ?? parsed.data

  const supabase = await createClient()

  const name = formatPropertyName({
    name: fields.name,
    street: fields.street,
    number: fields.number,
    complement: fields.complement,
    country_code: fields.country_code,
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
    return { success: false, errors: { general: ['createFailed'] } }
  }

  const result = data as { property_id: string; unit_id: string }
  revalidatePath('/app')
  return { success: true, propertyId: result.property_id, unitId: result.unit_id }
}
