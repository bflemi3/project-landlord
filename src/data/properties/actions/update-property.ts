'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
  postal_code: string
  country_code: string
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
    country_code: input.country_code,
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
      postal_code: input.postal_code,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.propertyId)

  if (!error) revalidatePath(`/app/p/${input.propertyId}`)
  return { success: !error }
}

export async function updateProperty(input: UpdatePropertyInput): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return updatePropertyCore(supabase, input)
}
