import type { TypedSupabaseClient } from '@/lib/supabase/types'

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
