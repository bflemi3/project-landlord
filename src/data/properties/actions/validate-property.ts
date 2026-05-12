'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import {
  getPropertyInputSchema,
  type PropertyInput,
} from '@/schemas/property'
import {
  zodIssuesToFieldErrors,
  type ValidateState,
} from '@/lib/validation'

export interface ValidatePropertyState extends ValidateState<PropertyInput> {
  existingPropertyId?: string
}

export async function validatePropertyCore(
  supabase: TypedSupabaseClient,
  fields: PropertyInput,
  excludePropertyId?: string,
): Promise<ValidatePropertyState> {
  const country = fields.country_code || 'BR'
  const propertyResult = getPropertyInputSchema(country).safeParse(fields)
  if (!propertyResult.success) {
    return {
      valid: false,
      errors: zodIssuesToFieldErrors<PropertyInput>(
        propertyResult.error.issues,
      ),
    }
  }

  const validatedFields = propertyResult.data

  // Duplicate address check
  if (validatedFields.postal_code && validatedFields.number) {
    let query = supabase
      .from('properties')
      .select('id')
      .eq('postal_code', validatedFields.postal_code)
      .eq('number', validatedFields.number)
      .is('deleted_at', null)

    // Match complement: use .is(null) for empty, .eq() for a value
    if (validatedFields.complement) {
      query = query.eq('complement', validatedFields.complement)
    } else {
      query = query.or('complement.is.null,complement.eq.')
    }

    query = query.limit(1)

    if (excludePropertyId) {
      query = query.neq('id', excludePropertyId)
    }

    const { data: existing } = await query.single()

    if (existing) {
      return { valid: false, existingPropertyId: existing.id, errors: { general: ['duplicateAddress'] } }
    }
  }

  return { valid: true, fields: validatedFields }
}

export async function validateProperty(fields: PropertyInput, excludePropertyId?: string): Promise<ValidatePropertyState> {
  const supabase = await createClient()
  return validatePropertyCore(supabase, fields, excludePropertyId)
}
