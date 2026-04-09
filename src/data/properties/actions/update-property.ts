'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { formatPropertyName } from '@/lib/address/format-property-name'

export interface UpdatePropertyInput {
  propertyId: string
  name: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  countryCode: string
}

export async function updatePropertyCore(
  supabase: TypedSupabaseClient,
  input: UpdatePropertyInput,
): Promise<{ success: boolean }> {
  const name = formatPropertyName({
    name: input.name,
    street: input.street,
    number: input.number,
    complement: input.complement,
    countryCode: input.countryCode,
  })

  const { error } = await supabase
    .from('properties')
    .update({
      name,
      street: input.street,
      number: input.number,
      complement: input.complement,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.propertyId)

  return { success: !error }
}

export async function updateProperty(input: UpdatePropertyInput): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return updatePropertyCore(supabase, input)
}
