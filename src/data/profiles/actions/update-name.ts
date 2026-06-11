'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { nameInputSchema, type NameInput } from '@/schemas/profile'
import { zodIssuesToFieldErrors, type ValidateState } from '@/lib/validation'

export async function updateNameCore(
  supabase: TypedSupabaseClient,
  fullName: string,
): Promise<ValidateState<NameInput>> {
  const result = nameInputSchema.safeParse({ full_name: fullName })
  if (!result.success) {
    return {
      valid: false,
      errors: zodIssuesToFieldErrors<NameInput>(result.error.issues),
    }
  }

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { valid: false, errors: { general: ['unauthenticated'] } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: result.data.full_name })
    .eq('id', userData.user.id)

  if (error) return { valid: false, errors: { general: ['updateFailed'] } }
  return { valid: true, fields: result.data }
}

export async function updateName(fullName: string): Promise<ValidateState<NameInput>> {
  const supabase = await createClient()
  return updateNameCore(supabase, fullName)
}
