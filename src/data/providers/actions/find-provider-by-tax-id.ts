'use server'

import { createClient } from '@/lib/supabase/server'
import { assertEngineer } from '@/lib/supabase/assert-engineer'

export interface ExistingProvider {
  id: string
  name: string
  display_name: string | null
  tax_id: string | null
  country_code: string
  email: string | null
  phone: string | null
}

export interface FindProviderResult {
  found: boolean
  provider?: ExistingProvider
}

export async function findProviderByTaxId(taxId: string): Promise<FindProviderResult> {
  try {
    await assertEngineer()
  } catch {
    return { found: false }
  }

  const cleaned = taxId.replace(/[.\-/\s]/g, '')
  if (!cleaned) return { found: false }

  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('id, name, display_name, tax_id, country_code, email, phone')
    .eq('tax_id', cleaned)
    .maybeSingle()

  if (!data) return { found: false }

  return { found: true, provider: data }
}
