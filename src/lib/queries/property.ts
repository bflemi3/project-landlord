import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface Property {
  id: string
  name: string
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string
  unitIds: string[]
}

export async function fetchProperty(supabase: TypedSupabaseClient, propertyId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id, name, street, number, complement, neighborhood,
      city, state, postal_code, country_code,
      units!inner ( id )
    `)
    .eq('id', propertyId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Property not found')

  const units = data.units as unknown as { id: string }[]

  return {
    id: data.id,
    name: data.name,
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
    postalCode: data.postal_code,
    countryCode: data.country_code,
    unitIds: units.map((u) => u.id),
  }
}

export const propertyQueryKey = (id: string) => ['property', id] as const
