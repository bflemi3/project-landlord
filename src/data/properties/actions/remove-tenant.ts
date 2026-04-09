'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function removeTenantCore(
  supabase: TypedSupabaseClient,
  membershipId: string,
): Promise<{ success: boolean }> {
  // Soft delete the membership
  const { error } = await supabase
    .from('memberships')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', membershipId)

  return { success: !error }
}

export async function removeTenant(membershipId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return removeTenantCore(supabase, membershipId)
}
