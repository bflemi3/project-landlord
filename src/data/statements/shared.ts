import type { TypedSupabaseClient } from '@/lib/supabase/types'

// --- Statement ---

export interface Statement {
  id: string
  unitId: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  tenantTotalMinor: number
  landlordTotalMinor: number
  currency: string
  publishedAt: string | null
  revision: number
  createdAt: string
  updatedAt: string
}

export async function fetchStatement(supabase: TypedSupabaseClient, statementId: string): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, unit_id, period_year, period_month, status, total_amount_minor, tenant_total_minor, landlord_total_minor, currency, published_at, revision, created_at, updated_at')
    .eq('id', statementId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Statement not found')

  return {
    id: data.id,
    unitId: data.unit_id,
    periodYear: data.period_year,
    periodMonth: data.period_month,
    status: data.status as Statement['status'],
    totalAmountMinor: data.total_amount_minor,
    tenantTotalMinor: data.tenant_total_minor,
    landlordTotalMinor: data.landlord_total_minor,
    currency: data.currency,
    publishedAt: data.published_at,
    revision: data.revision,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const statementQueryKey = (id: string) => ['statement', id] as const

// --- Statement Charges ---

export interface ChargeInstance {
  id: string
  statementId: string
  chargeDefinitionId: string | null
  sourceDocumentId: string | null
  name: string
  amountMinor: number
  currency: string
  chargeSource: 'manual' | 'imported' | 'corrected'
  chargeType: 'rent' | 'recurring' | 'variable' | null
  splitType: 'percentage' | 'fixed_amount'
  landlordPercentage: number | null
  tenantPercentage: number | null
  landlordFixedMinor: number | null
  tenantFixedMinor: number | null
  sourceDocument: { id: string; fileName: string; mimeType: string; filePath: string } | null
}

export async function fetchStatementCharges(
  supabase: TypedSupabaseClient,
  statementId: string,
): Promise<ChargeInstance[]> {
  const { data, error } = await supabase
    .from('charge_instances')
    .select(`
      id, statement_id, charge_definition_id, source_document_id,
      name, amount_minor, currency, charge_source, split_type,
      landlord_percentage, tenant_percentage, landlord_fixed_minor, tenant_fixed_minor,
      source_documents ( id, file_name, mime_type, file_path ),
      charge_definitions ( charge_type )
    `)
    .eq('statement_id', statementId)
    .order('created_at')

  if (error || !data) return []

  return data.map((row) => {
    const doc = row.source_documents as unknown as { id: string; file_name: string; mime_type: string; file_path: string } | null
    const def = row.charge_definitions as unknown as { charge_type: string } | null
    return {
      id: row.id,
      statementId: row.statement_id,
      chargeDefinitionId: row.charge_definition_id,
      sourceDocumentId: row.source_document_id,
      name: row.name,
      amountMinor: row.amount_minor,
      currency: row.currency,
      chargeSource: row.charge_source as ChargeInstance['chargeSource'],
      chargeType: (def?.charge_type as ChargeInstance['chargeType']) ?? null,
      splitType: row.split_type as ChargeInstance['splitType'],
      landlordPercentage: row.landlord_percentage,
      tenantPercentage: row.tenant_percentage,
      landlordFixedMinor: row.landlord_fixed_minor,
      tenantFixedMinor: row.tenant_fixed_minor,
      sourceDocument: doc ? { id: doc.id, fileName: doc.file_name, mimeType: doc.mime_type, filePath: doc.file_path } : null,
    }
  })
}

export const statementChargesQueryKey = (statementId: string) => ['statement-charges', statementId] as const

// --- Missing Charges ---

export interface MissingCharge {
  definitionId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
}

/**
 * Fetches active charge definitions for the unit that have no matching
 * charge instance on the given statement. These are "expected" charges
 * that appear as completeness warnings.
 */
export async function fetchMissingCharges(
  supabase: TypedSupabaseClient,
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<MissingCharge[]> {
  // Get all active definitions for this unit
  const { data: definitions, error: defError } = await supabase
    .from('charge_definitions')
    .select('id, name, charge_type, amount_minor, recurring_rules ( start_date, end_date )')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (defError || !definitions) return []

  // Get all charge instances on this statement that reference a definition
  const { data: instances, error: instError } = await supabase
    .from('charge_instances')
    .select('charge_definition_id')
    .eq('statement_id', statementId)
    .not('charge_definition_id', 'is', null)

  if (instError) return []

  const coveredIds = new Set((instances ?? []).map((i) => i.charge_definition_id))

  // Filter to definitions not covered and in period
  return definitions
    .filter((def) => !coveredIds.has(def.id))
    .filter((def) => {
      const rules = (def.recurring_rules ?? []) as unknown as { start_date: string; end_date: string | null }[]
      const rule = rules[0]
      if (!rule) return true // no rule = always active
      const periodKey = periodYear * 100 + periodMonth
      const [sy, sm] = rule.start_date.split('-').map(Number)
      if (periodKey < sy * 100 + sm) return false
      if (rule.end_date) {
        const [ey, em] = rule.end_date.split('-').map(Number)
        if (periodKey > ey * 100 + em) return false
      }
      return true
    })
    .map((def) => ({
      definitionId: def.id,
      name: def.name,
      chargeType: def.charge_type as MissingCharge['chargeType'],
      amountMinor: def.amount_minor,
    }))
}

export const missingChargesQueryKey = (unitId: string, statementId: string, _periodYear?: number, _periodMonth?: number) =>
  ['missing-charges', unitId, statementId] as const
