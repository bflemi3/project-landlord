'use server'

import { createClient } from '@/lib/supabase/server'

export interface AddUnitState {
  success: boolean
  unitId?: string
  errors?: {
    name?: string
    general?: string
  }
}

export async function addUnit(
  _prevState: AddUnitState,
  formData: FormData,
): Promise<AddUnitState> {
  const propertyId = (formData.get('property_id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!propertyId) {
    return { success: false, errors: { general: 'missingProperty' } }
  }

  if (!name) {
    return { success: false, errors: { name: 'required' } }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .insert({ property_id: propertyId, name })
    .select('id')
    .single()

  if (error) {
    return { success: false, errors: { general: 'createFailed' } }
  }

  return { success: true, unitId: data.id }
}
