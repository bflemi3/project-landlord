'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { getAddressProvider } from '@/lib/address/provider'
import { propertySchema, type PropertyInput } from '@/data/properties/schema'

type PropertyFieldErrors = {
  [K in keyof PropertyInput]?: readonly string[]
}

export interface ValidatePropertyState {
  valid: boolean
  fields?: PropertyInput
  existingPropertyId?: string
  errors?: PropertyFieldErrors & {
    general?: readonly string[]
  }
}

function zodIssuesToFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): NonNullable<ValidatePropertyState['errors']> {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'general')
    fieldErrors[key] ??= []
    fieldErrors[key]!.push(issue.message)
  }

  return fieldErrors as NonNullable<ValidatePropertyState['errors']>
}

export async function validatePropertyCore(
  supabase: TypedSupabaseClient,
  fields: PropertyInput,
  excludePropertyId?: string,
): Promise<ValidatePropertyState> {
  const errors: ValidatePropertyState['errors'] = {}

  const propertyResult = propertySchema.safeParse(fields)
  if (!propertyResult.success) {
    return { valid: false, errors: zodIssuesToFieldErrors(propertyResult.error.issues) }
  }

  const validatedFields = propertyResult.data

  // Address validation via country-specific provider
  const addressProvider = getAddressProvider(validatedFields.country_code)
  const addressErrors = addressProvider.validateAddress({
    postal_code: validatedFields.postal_code || undefined,
    street: validatedFields.street || undefined,
    number: validatedFields.number || undefined,
    complement: validatedFields.complement || undefined,
    neighborhood: validatedFields.neighborhood || undefined,
    city: validatedFields.city || undefined,
    state: validatedFields.state || undefined,
  })

  if (addressErrors) {
    Object.assign(errors, addressErrors)
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

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
