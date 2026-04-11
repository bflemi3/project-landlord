'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'
import { parseSplit, type AllocationRow } from '@/lib/split-allocations'

export interface AddChargeInput {
  statementId: string
  name: string
  amountMinor: number
  chargeDefinitionId?: string
  sourceDocumentId?: string
  /** Split fields for ad-hoc charges. Omit to use definition's allocations or default to 100% tenant. */
  splitType?: 'percentage' | 'fixed_amount'
  tenantPercentage?: number | null
  landlordPercentage?: number | null
  tenantFixedMinor?: number | null
  landlordFixedMinor?: number | null
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
  // Resolve split fields: explicit > from definition > default 100% tenant
  let splitType: 'percentage' | 'fixed_amount' = input.splitType ?? 'percentage'
  let tenantPercentage: number | null = input.tenantPercentage ?? 100
  let landlordPercentage: number | null = input.landlordPercentage ?? 0
  let tenantFixedMinor: number | null = input.tenantFixedMinor ?? null
  let landlordFixedMinor: number | null = input.landlordFixedMinor ?? null

  // If linked to a definition and no explicit split, copy from definition
  if (input.chargeDefinitionId && input.splitType === undefined) {
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

  // Get statement currency
  const { data: stmt } = await supabase
    .from('statements')
    .select('currency')
    .eq('id', input.statementId)
    .single()

  const currency = stmt?.currency ?? 'BRL'

  const { data: instance, error } = await supabase
    .from('charge_instances')
    .insert({
      statement_id: input.statementId,
      charge_definition_id: input.chargeDefinitionId ?? null,
      source_document_id: input.sourceDocumentId ?? null,
      name: input.name,
      amount_minor: input.amountMinor,
      currency,
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

export async function addChargeToStatement(input: AddChargeInput & { propertyId?: string }): Promise<AddChargeResult> {
  const supabase = await createClient()
  const result = await addChargeToStatementCore(supabase, input)
  if (result.success) {
    revalidatePath(
      input.propertyId ? `/app/p/${input.propertyId}/s/${input.statementId}` : '/app',
      input.propertyId ? undefined : 'layout',
    )
  }
  return result
}
