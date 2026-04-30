import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

type PropertyRow = Database['public']['Tables']['properties']['Row']

export type Property = PropertyRow & {
  unit_ids: string[]
}

export async function fetchProperty(supabase: TypedSupabaseClient, propertyId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *, units!inner ( id )
    `)
    .eq('id', propertyId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Property not found')

  const units = data.units as unknown as { id: string }[]

  return {
    ...data,
    unit_ids: units.map((u) => u.id),
  }
}

export const propertyQueryKey = (id: string) => ['property', id] as const
