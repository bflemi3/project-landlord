'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function cancelInviteCore(
  supabase: TypedSupabaseClient,
  inviteId: string,
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'pending')

  return { success: !error }
}

export async function cancelInvite(inviteId: string, propertyId?: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const result = await cancelInviteCore(supabase, inviteId)
  if (result.success) {
    revalidatePath(propertyId ? `/app/p/${propertyId}` : '/app', propertyId ? undefined : 'layout')
  }
  return result
}
