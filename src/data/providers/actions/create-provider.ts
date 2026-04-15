'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertEngineer } from '@/lib/supabase/assert-engineer'

export interface CreateProviderState {
  success: boolean
  providerId?: string
  errors?: {
    name?: string
    general?: string
  }
}

export async function createProvider(
  _prevState: CreateProviderState,
  formData: FormData,
): Promise<CreateProviderState> {
  const name = formData.get('name') as string | null
  const displayName = formData.get('display_name') as string | null
  const taxId = formData.get('tax_id') as string | null
  const countryCode = (formData.get('country_code') as string) || 'BR'
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  const website = formData.get('website') as string | null
  const companyCacheId = formData.get('company_cache_id') as string | null
  const billFile = formData.get('bill_file') as File | null

  let userId: string
  try {
    userId = await assertEngineer()
  } catch {
    return { success: false, errors: { general: 'Engineer access required' } }
  }

  if (!name || !name.trim()) {
    return { success: false, errors: { name: 'Provider name is required' } }
  }

  // Upload bill to storage first (outside transaction — if this fails, no DB changes)
  let billStoragePath: string | null = null
  if (billFile && billFile.size > 0) {
    billStoragePath = `${crypto.randomUUID()}/${billFile.name}`

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error: uploadError } = await serviceClient.storage
      .from('test-bills')
      .upload(billStoragePath, billFile, { contentType: 'application/pdf' })

    if (uploadError) {
      billStoragePath = null
    }
  }

  // Create provider + test bill row in a single transaction via RPC
  const supabase = await createClient()

  const { data: providerId, error } = await supabase.rpc('create_provider_with_bill', {
    p_name: name.trim(),
    p_display_name: displayName?.trim() || null,
    p_tax_id: taxId?.trim() || null,
    p_country_code: countryCode,
    p_email: email?.trim() || null,
    p_phone: phone?.trim() || null,
    p_website: website?.trim() || null,
    p_company_cache_id: companyCacheId || null,
    p_bill_storage_path: billStoragePath,
    p_bill_file_name: billFile?.name ?? null,
    p_bill_uploaded_by: userId,
  })

  if (error || !providerId) {
    // Clean up uploaded file if DB transaction failed
    if (billStoragePath) {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      await serviceClient.storage.from('test-bills').remove([billStoragePath])
    }

    const parts = [
      error?.message && `Error: ${error.message}`,
      error?.details && `Details: ${error.details}`,
      error?.hint && `Hint: ${error.hint}`,
      error?.code && `Code: ${error.code}`,
    ].filter(Boolean)
    return { success: false, errors: { general: parts.join('\n') || 'Failed to create provider (no error details)' } }
  }

  revalidatePath('/eng/providers')
  return { success: true, providerId }
}
