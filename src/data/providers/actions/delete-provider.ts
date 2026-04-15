'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertEngineer } from '@/lib/supabase/assert-engineer'

export interface DeleteProviderResult {
  success: boolean
  error?: string
}

export async function deleteProvider(providerId: string): Promise<DeleteProviderResult> {
  try {
    await assertEngineer()
  } catch {
    return { success: false, error: 'Engineer access required' }
  }

  const supabase = await createClient()

  // Delete all DB rows in a single transaction via RPC
  // Returns storage paths so we can clean up files after commit
  const { data: storagePaths, error } = await supabase.rpc('delete_provider_cascade', {
    p_provider_id: providerId,
  })

  if (error) {
    const parts = [
      error.message && `Error: ${error.message}`,
      error.details && `Details: ${error.details}`,
      error.hint && `Hint: ${error.hint}`,
      error.code && `Code: ${error.code}`,
    ].filter(Boolean)
    return { success: false, error: parts.join('\n') || 'Failed to delete provider' }
  }

  // Clean up storage files after DB transaction committed
  if (storagePaths && storagePaths.length > 0) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    await serviceClient.storage.from('test-bills').remove(storagePaths)
  }

  revalidatePath('/eng/providers')
  return { success: true }
}
