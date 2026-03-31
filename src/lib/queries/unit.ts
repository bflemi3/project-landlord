import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface Unit {
  id: string
  name: string
  dueDay: number
  pixKey: string | null
  pixKeyType: string | null
  currency: string
}

export async function fetchUnit(supabase: TypedSupabaseClient, unitId: string): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, due_day_of_month, pix_key, pix_key_type, currency')
    .eq('id', unitId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Unit not found')

  return {
    id: data.id,
    name: data.name,
    dueDay: data.due_day_of_month,
    pixKey: data.pix_key,
    pixKeyType: data.pix_key_type,
    currency: data.currency,
  }
}

export const unitQueryKey = (id: string) => ['unit', id] as const
