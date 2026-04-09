'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { buildAllocationRows, type SplitInput } from '@/lib/split-allocations'

export interface ChargeInput extends SplitInput {
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
}

export interface CreateChargesResult {
  success: boolean
  failedCharges: string[]
}

export async function validateCharge(charge: ChargeInput): Promise<string | null> {
  if ((charge.chargeType === 'rent' || charge.chargeType === 'recurring') && charge.amountMinor !== null && charge.amountMinor <= 0) {
    return `Fixed charge amount must be positive: ${charge.amountMinor}`
  }
  return null
}

export async function createChargesCore(
  supabase: TypedSupabaseClient,
  unitId: string,
  charges: ChargeInput[],
): Promise<CreateChargesResult> {
  if (charges.length === 0) return { success: true, failedCharges: [] }

  const failedCharges: string[] = []

  for (const charge of charges) {
    const validationError = await validateCharge(charge)
    if (validationError) {
      console.error(`Validation failed for charge "${charge.name}":`, validationError)
      failedCharges.push(charge.name)
      continue
    }

    // 1. Create charge definition
    const { data: chargeDef, error: chargeError } = await supabase
      .from('charge_definitions')
      .insert({
        unit_id: unitId,
        name: charge.name,
        charge_type: charge.chargeType,
        amount_minor: charge.amountMinor,
        currency: 'BRL',
      })
      .select('id')
      .single()

    if (chargeError || !chargeDef) {
      console.error('Failed to create charge definition:', chargeError)
      failedCharges.push(charge.name)
      continue
    }

    // 2. Create recurring rule
    const { error: ruleError } = await supabase
      .from('recurring_rules')
      .insert({
        charge_definition_id: chargeDef.id,
        start_date: new Date().toISOString().split('T')[0],
        day_of_month: 1,
      })

    if (ruleError) {
      console.error('Failed to create recurring rule:', ruleError)
      failedCharges.push(charge.name)
      continue
    }

    // 3. Create responsibility allocations
    const allocations = buildAllocationRows(charge).map((a) => ({
      ...a,
      charge_definition_id: chargeDef.id,
    }))

    const { error: allocError } = await supabase
      .from('responsibility_allocations')
      .insert(allocations)

    if (allocError) {
      console.error('Failed to create responsibility allocations:', allocError)
      failedCharges.push(charge.name)
    }
  }

  return {
    success: failedCharges.length === 0,
    failedCharges,
  }
}

export async function createCharges(
  unitId: string,
  charges: ChargeInput[],
): Promise<CreateChargesResult> {
  const supabase = await createClient()
  return createChargesCore(supabase, unitId, charges)
}
