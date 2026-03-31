'use server'

import { createClient } from '@/lib/supabase/server'
import { getAddressProvider } from '@/lib/address/provider'

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

export interface PropertyFields {
  name: string
  postal_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country_code: string
}

export interface ValidatePropertyState {
  valid: boolean
  fields?: PropertyFields
  existingPropertyId?: string
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

export async function parsePropertyFormData(formData: FormData): Promise<PropertyFields> {
  return {
    name: stripHtml((formData.get('name') as string)?.trim() ?? ''),
    postal_code: stripHtml((formData.get('postal_code') as string)?.trim() ?? ''),
    street: stripHtml((formData.get('street') as string)?.trim() ?? ''),
    number: stripHtml((formData.get('number') as string)?.trim() ?? ''),
    complement: stripHtml((formData.get('complement') as string)?.trim() ?? ''),
    neighborhood: stripHtml((formData.get('neighborhood') as string)?.trim() ?? ''),
    city: stripHtml((formData.get('city') as string)?.trim() ?? ''),
    state: stripHtml((formData.get('state') as string)?.trim() ?? ''),
    country_code: (formData.get('country_code') as string)?.trim() || 'BR',
  }
}

export async function validateProperty(fields: PropertyFields): Promise<ValidatePropertyState> {
  const errors: ValidatePropertyState['errors'] = {}

  // Name validation (optional — auto-generated from address if blank)
  if (fields.name && fields.name.length > 100) {
    errors.name = 'tooLong'
  }

  // Address validation via country-specific provider
  const addressProvider = getAddressProvider(fields.country_code)
  const addressErrors = addressProvider.validateAddress({
    postal_code: fields.postal_code || undefined,
    street: fields.street || undefined,
    number: fields.number || undefined,
    complement: fields.complement || undefined,
    neighborhood: fields.neighborhood || undefined,
    city: fields.city || undefined,
    state: fields.state || undefined,
  })

  if (addressErrors) {
    Object.assign(errors, addressErrors)
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  // Duplicate address check
  const supabase = await createClient()
  if (fields.postal_code && fields.number) {
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('postal_code', fields.postal_code)
      .eq('number', fields.number)
      .eq('complement', fields.complement || '')
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (existing) {
      return { valid: false, existingPropertyId: existing.id, errors: { general: 'duplicateAddress' } }
    }
  }

  return { valid: true, fields }
}
