'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { detectTaxIdKindBR } from '@/lib/tax-id/br'
import { verifyCnpjExists } from '@/lib/billing-intelligence/identification/cnpj-lookup'
import { taxIdInputSchema, type TaxIdInput } from '@/schemas/profile'
import { zodIssuesToFieldErrors, type ValidateState } from '@/lib/validation'

export async function updateTaxIdCore(
  supabase: TypedSupabaseClient,
  taxId: string,
): Promise<ValidateState<TaxIdInput>> {
  const result = taxIdInputSchema.safeParse({ tax_id: taxId })
  if (!result.success) {
    return {
      valid: false,
      errors: zodIssuesToFieldErrors<TaxIdInput>(result.error.issues),
    }
  }

  const validated = result.data.tax_id

  // CNPJs that pass check-digit validation can still be unallocated, so we
  // probe BrasilAPI / ReceitaWS to confirm existence before persisting. CPF
  // has no public lookup API; algorithmic validation is the strongest
  // guarantee available.
  if (validated.length > 0 && detectTaxIdKindBR(validated) === 'cnpj') {
    const status = await verifyCnpjExists(validated)
    if (status === 'not-found') {
      return { valid: false, errors: { tax_id: ['cnpjNotFound'] } }
    }
    if (status === 'unreachable') {
      return { valid: false, errors: { tax_id: ['cnpjVerificationUnavailable'] } }
    }
  }

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { valid: false, errors: { general: ['unauthenticated'] } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ tax_id: validated || null })
    .eq('id', userData.user.id)

  if (error) return { valid: false, errors: { general: ['updateFailed'] } }
  return { valid: true, fields: result.data }
}

export async function updateTaxId(
  taxId: string,
): Promise<ValidateState<TaxIdInput>> {
  const supabase = await createClient()
  return updateTaxIdCore(supabase, taxId)
}
