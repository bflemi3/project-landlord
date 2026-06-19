import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface Property {
  id: string
  name: string
  neighborhood: string | null
  city: string | null
}

export const propertyQueryKey = (propertyId: string) => ['property', propertyId] as const

// Nullable — used by the page's access gate (`null` → notFound).
export async function fetchProperty(
  supabase: TypedSupabaseClient,
  propertyId: string,
): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, neighborhood, city')
    .eq('id', propertyId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

// Non-nullable — used by the `useProperty` suspense hook (throws so `data` stays
// non-null). In practice the page seeds the cache, so this only runs on a miss.
export async function fetchPropertyOrThrow(
  supabase: TypedSupabaseClient,
  propertyId: string,
): Promise<Property> {
  const property = await fetchProperty(supabase, propertyId)
  if (!property) throw new Error(`Property ${propertyId} not found`)
  return property
}
