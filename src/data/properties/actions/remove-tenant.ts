'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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

export async function removeTenant(membershipId: string, propertyId?: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const result = await removeTenantCore(supabase, membershipId)
  if (result.success) {
    revalidatePath(propertyId ? `/app/p/${propertyId}` : '/app', propertyId ? undefined : 'layout')
  }
  return result
}
