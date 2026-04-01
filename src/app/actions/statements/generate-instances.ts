'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import {
  generateChargeInstances,
  type ChargeDefinitionWithRule,
} from '@/lib/generate-charge-instances'

export interface GenerateResult {
  success: boolean
  instanceCount: number
}

export async function fetchDefinitionsWithRules(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<ChargeDefinitionWithRule[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select(`
      id, name, charge_type, amount_minor, currency, is_active,
      recurring_rules ( start_date, end_date, day_of_month ),
      responsibility_allocations ( role, allocation_type, percentage, fixed_minor )
    `)
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch charge definitions: ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const rules = (row.recurring_rules ?? []) as unknown as {
      start_date: string
      end_date: string | null
      day_of_month: number
    }[]
    const rule = rules[0] ?? null

    const allocations = (row.responsibility_allocations ?? []) as unknown as {
      role: string
      allocation_type: string
      percentage: number | null
      fixed_minor: number | null
    }[]

    return {
      id: row.id,
      name: row.name,
      chargeType: row.charge_type as 'rent' | 'recurring' | 'variable',
      amountMinor: row.amount_minor,
      currency: row.currency,
      isActive: row.is_active,
      recurringRule: rule
        ? {
            startDate: rule.start_date,
            endDate: rule.end_date,
            dayOfMonth: rule.day_of_month,
          }
        : null,
      allocations,
    }
  })
}

export async function generateAndPersistInstancesCore(
  supabase: TypedSupabaseClient,
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<GenerateResult> {
  const definitions = await fetchDefinitionsWithRules(supabase, unitId)
  const instances = generateChargeInstances(definitions, periodYear, periodMonth)

  // Delete any existing instances for this statement (idempotent regeneration)
  const { error: deleteError } = await supabase
    .from('charge_instances')
    .delete()
    .eq('statement_id', statementId)

  if (deleteError) {
    throw new Error(`Failed to clear existing charge instances: ${deleteError.message}`)
  }

  if (instances.length === 0) {
    return { success: true, instanceCount: 0 }
  }

  const rows = instances.map((instance) => ({
    statement_id: statementId,
    charge_definition_id: instance.chargeDefinitionId,
    name: instance.name,
    amount_minor: instance.amountMinor,
    currency: instance.currency,
    charge_source: instance.chargeSource,
    split_type: instance.splitType,
    tenant_percentage: instance.tenantPercentage,
    landlord_percentage: instance.landlordPercentage,
    tenant_fixed_minor: instance.tenantFixedMinor,
    landlord_fixed_minor: instance.landlordFixedMinor,
  }))

  const { error } = await supabase.from('charge_instances').insert(rows)

  if (error) {
    throw new Error(`Failed to persist charge instances: ${error.message}`)
  }

  return { success: true, instanceCount: instances.length }
}

export async function generateAndPersistInstances(
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<GenerateResult> {
  const supabase = await createClient()
  return generateAndPersistInstancesCore(supabase, unitId, statementId, periodYear, periodMonth)
}
