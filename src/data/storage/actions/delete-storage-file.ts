'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function deleteStorageFileCore(
  supabase: TypedSupabaseClient,
  bucket: string,
  path: string,
): Promise<{ success: boolean }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  return { success: !error }
}

export async function deleteStorageFile(
  bucket: string,
  path: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return deleteStorageFileCore(supabase, bucket, path)
}
