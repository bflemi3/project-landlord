'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'
import { DEFAULT_SPLIT, parseSplit, type AllocationRow } from '@/lib/split-allocations'

export interface AddChargeInput {
  statementId: string
  name: string
  amountMinor: number
  chargeDefinitionId?: string
  sourceDocumentId?: string
}

export interface AddChargeResult {
  success: boolean
  chargeInstanceId?: string
  error?: string
}

export async function addChargeToStatementCore(
  supabase: TypedSupabaseClient,
  input: AddChargeInput,
): Promise<AddChargeResult> {
  // Resolve split fields from definition or default to 100% tenant
  let splitType: 'percentage' | 'fixed_amount' = 'percentage'
  let tenantPercentage: number | null = 100
  let landlordPercentage: number | null = 0
  let tenantFixedMinor: number | null = null
  let landlordFixedMinor: number | null = null

  if (input.chargeDefinitionId) {
    const { data: allocations } = await supabase
      .from('responsibility_allocations')
      .select('role, allocation_type, percentage, fixed_minor')
      .eq('charge_definition_id', input.chargeDefinitionId)

    if (allocations && allocations.length > 0) {
      const split = parseSplit(allocations as AllocationRow[])
      splitType = split.allocationType
      tenantPercentage = split.allocationType === 'percentage' ? split.tenantPercent : null
      landlordPercentage = split.allocationType === 'percentage' ? split.landlordPercent : null
      tenantFixedMinor = split.allocationType === 'fixed_amount' ? split.tenantFixedMinor : null
      landlordFixedMinor = split.allocationType === 'fixed_amount' ? split.landlordFixedMinor : null
    }
  }

  const { data: instance, error } = await supabase
    .from('charge_instances')
    .insert({
      statement_id: input.statementId,
      charge_definition_id: input.chargeDefinitionId ?? null,
      source_document_id: input.sourceDocumentId ?? null,
      name: input.name,
      amount_minor: input.amountMinor,
      currency: 'BRL',
      charge_source: 'manual',
      split_type: splitType,
      tenant_percentage: tenantPercentage,
      landlord_percentage: landlordPercentage,
      tenant_fixed_minor: tenantFixedMinor,
      landlord_fixed_minor: landlordFixedMinor,
    })
    .select('id')
    .single()

  if (error || !instance) {
    return { success: false, error: error?.message ?? 'Failed to add charge' }
  }

  await recalculateStatementTotal(supabase, input.statementId)

  return { success: true, chargeInstanceId: instance.id }
}

export async function addChargeToStatement(input: AddChargeInput): Promise<AddChargeResult> {
  const supabase = await createClient()
  return addChargeToStatementCore(supabase, input)
}
