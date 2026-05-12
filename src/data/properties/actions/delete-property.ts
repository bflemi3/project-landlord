'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'

export async function deletePropertyAction(propertyId: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) throw new Error('unauthenticated')

  const supabase = await createClient()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) throw new Error(error.message)

  revalidatePath('/app')
  redirect('/app')
}
