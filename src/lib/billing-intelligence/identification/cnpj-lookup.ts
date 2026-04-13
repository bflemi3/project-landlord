import { createClient } from '@supabase/supabase-js'
import { externalFetch } from '@/lib/external/call'

export interface CompanyInfo {
  cnpj: string
  companyName: string
  legalName: string
  activityCode: number
  activityDescription: string
  city: string
  state: string
  source: 'brasilapi' | 'receitaws' | 'cache'
  /** When this data was last updated (from cache or freshly fetched) */
  lastUpdated: string         // ISO 8601 timestamp
}

const CACHE_MAX_AGE_DAYS = 30

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function lookupFromCache(taxId: string): Promise<CompanyInfo | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('company_cache')
    .select('*')
    .eq('tax_id', taxId)
    .single()

  if (!data) return null

  const ageInDays = (Date.now() - new Date(data.fetched_at).getTime()) / (1000 * 60 * 60 * 24)
  if (ageInDays > CACHE_MAX_AGE_DAYS) return null

  return {
    cnpj: data.tax_id,
    companyName: data.trade_name || data.legal_name,
    legalName: data.legal_name,
    activityCode: data.activity_code,
    activityDescription: data.activity_description,
    city: data.city,
    state: data.state,
    source: 'cache',
    lastUpdated: data.updated_at,
  }
}

/**
 * Save CompanyInfo to the DB cache. Handles the mapping from
 * CompanyInfo fields to DB column names internally.
 * Tracks field changes in company_cache_history.
 */
async function saveToCache(info: CompanyInfo): Promise<void> {
  const supabase = getServiceClient()
  const now = new Date().toISOString()

  const dbRow = {
    legal_name: info.legalName,
    trade_name: info.companyName !== info.legalName ? info.companyName : null,
    activity_code: info.activityCode,
    activity_description: info.activityDescription,
    city: info.city,
    state: info.state,
    source: info.source,
    fetched_at: now,
    updated_at: now,
  }

  const existing = await supabase
    .from('company_cache')
    .select('id, legal_name, trade_name, activity_description, city, state')
    .eq('tax_id', info.cnpj)
    .single()

  if (existing.data) {
    // Track changes
    const trackFields = ['legal_name', 'trade_name', 'activity_description', 'city', 'state'] as const
    for (const field of trackFields) {
      const oldVal = String(existing.data[field] ?? '')
      const newVal = String(dbRow[field] ?? '')
      if (oldVal !== newVal) {
        await supabase.from('company_cache_history').insert({
          company_cache_id: existing.data.id,
          field_changed: field,
          old_value: oldVal,
          new_value: newVal,
        })
      }
    }

    await supabase
      .from('company_cache')
      .update(dbRow)
      .eq('id', existing.data.id)
  } else {
    await supabase.from('company_cache').insert({
      tax_id: info.cnpj,
      country_code: 'BR',
      ...dbRow,
    })
  }
}

/** Fetch company info from BrasilAPI using the external dependency monitor. */
async function fetchFromBrasilApi(cnpj: string): Promise<CompanyInfo> {
  const result = await externalFetch<Record<string, unknown>>({
    service: 'brasilapi',
    operation: 'cnpj-lookup',
    url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'BrasilAPI lookup failed')
  }

  const data = result.data
  return {
    cnpj: String(data.cnpj),
    companyName: String(data.nome_fantasia || data.razao_social),
    legalName: String(data.razao_social),
    activityCode: Number(data.cnae_fiscal),
    activityDescription: String(data.cnae_fiscal_descricao),
    city: String(data.municipio),
    state: String(data.uf),
    source: 'brasilapi',
    lastUpdated: new Date().toISOString(),
  }
}

/** Fetch company info from ReceitaWS using the external dependency monitor. */
async function fetchFromReceitaWs(cnpj: string): Promise<CompanyInfo> {
  const result = await externalFetch<Record<string, unknown>>({
    service: 'receitaws',
    operation: 'cnpj-lookup',
    url: `https://receitaws.com.br/v1/cnpj/${cnpj}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'ReceitaWS lookup failed')
  }

  const data = result.data
  const atividades = data.atividade_principal as Array<{ code: string; text: string }> | undefined
  return {
    cnpj: String(data.cnpj ?? '').replace(/[.\-/]/g, '') || cnpj,
    companyName: String(data.fantasia || data.nome),
    legalName: String(data.nome),
    activityCode: atividades?.[0]?.code
      ? parseInt(atividades[0].code.replace(/[.\-]/g, ''), 10)
      : 0,
    activityDescription: atividades?.[0]?.text ?? 'Unknown',
    city: String(data.municipio),
    state: String(data.uf),
    source: 'receitaws',
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Look up company info by tax ID.
 * DB cache (30 days) -> BrasilAPI -> ReceitaWS.
 * Caches results and tracks changes.
 */
export async function lookupCnpj(cnpj: string): Promise<CompanyInfo> {
  const clean = cnpj.replace(/[.\-/]/g, '')

  const cached = await lookupFromCache(clean)
  if (cached) return cached

  try {
    const result = await fetchFromBrasilApi(clean)
    await saveToCache(result)
    return result
  } catch { /* fallthrough */ }

  try {
    const result = await fetchFromReceitaWs(clean)
    await saveToCache(result)
    return result
  } catch { /* fallthrough */ }

  throw new Error('CNPJ lookup failed: cache miss and both BrasilAPI and ReceitaWS returned errors')
}
