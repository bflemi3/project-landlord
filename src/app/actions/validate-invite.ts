'use server'

import { createClient } from '@/lib/supabase/server'

export async function validateInviteCode(code: string): Promise<{ valid: boolean }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('validate_invite_code', {
    invite_code: code,
  })

  if (error) return { valid: false }

  return { valid: !!data }
}
