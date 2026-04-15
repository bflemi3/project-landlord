'use server'

import { createClient } from '@supabase/supabase-js'
import { lookupCnpj, type CompanyInfo } from '@/lib/billing-intelligence/identification/cnpj-lookup'
import { assertEngineer } from '@/lib/supabase/assert-engineer'

export interface LookupCnpjResult {
  success: boolean
  companyInfo?: CompanyInfo
  companyCacheId?: string
  status?: 'found' | 'not_found' | 'error'
  message?: string
}

export async function lookupCnpjAction(taxId: string): Promise<LookupCnpjResult> {
  try {
    await assertEngineer()
  } catch {
    return { success: false, status: 'error', message: 'Engineer access required' }
  }

  const cleaned = taxId.replace(/[.\-/\s]/g, '')

  if (!cleaned) {
    return { success: false, status: 'error', message: 'Tax ID is required' }
  }

  let companyInfo: CompanyInfo
  try {
    companyInfo = await lookupCnpj(cleaned)
  } catch {
    return {
      success: true,
      status: 'not_found',
      message: 'Company not found in public registries. You can fill in the details manually.',
    }
  }

  // Fetch the company_cache row ID so the form can pass it to create-provider
  let companyCacheId: string | undefined
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await supabase
      .from('company_cache')
      .select('id')
      .eq('tax_id', cleaned)
      .single()

    companyCacheId = data?.id
  } catch {
    // Non-fatal — provider can still be created without company_cache_id
  }

  return {
    success: true,
    status: 'found',
    companyInfo,
    companyCacheId,
  }
}
