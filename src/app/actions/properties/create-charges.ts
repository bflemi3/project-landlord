'use server'

import { createClient } from '@/lib/supabase/server'

export interface ChargeInput {
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  dueDay: number
  payer: 'tenant' | 'landlord' | 'split'
  tenantPercent: number
  landlordPercent: number
}

export interface CreateChargesResult {
  success: boolean
  failedCharges: string[]
}

function validateCharge(charge: ChargeInput): string | null {
  if (charge.dueDay < 1 || charge.dueDay > 28) {
    return `Invalid due day: ${charge.dueDay}`
  }
  if (charge.tenantPercent + charge.landlordPercent !== 100) {
    return `Percentages must sum to 100: ${charge.tenantPercent} + ${charge.landlordPercent}`
  }
  if ((charge.chargeType === 'rent' || charge.chargeType === 'recurring') && charge.amountMinor !== null && charge.amountMinor <= 0) {
    return `Fixed charge amount must be positive: ${charge.amountMinor}`
  }
  return null
}

export async function createCharges(
  unitId: string,
  charges: ChargeInput[],
): Promise<CreateChargesResult> {
  if (charges.length === 0) return { success: true, failedCharges: [] }

  const supabase = await createClient()
  const failedCharges: string[] = []

  for (const charge of charges) {
    const validationError = validateCharge(charge)
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
        day_of_month: charge.dueDay,
      })

    if (ruleError) {
      console.error('Failed to create recurring rule:', ruleError)
      failedCharges.push(charge.name)
      continue
    }

    // 3. Create responsibility allocation(s)
    if (charge.payer === 'tenant') {
      const { error } = await supabase.from('responsibility_allocations').insert({
        charge_definition_id: chargeDef.id,
        role: 'tenant',
        allocation_type: 'percentage',
        percentage: 100,
      })
      if (error) {
        console.error('Failed to create responsibility allocation:', error)
        failedCharges.push(charge.name)
      }
    } else if (charge.payer === 'landlord') {
      const { error } = await supabase.from('responsibility_allocations').insert({
        charge_definition_id: chargeDef.id,
        role: 'landlord',
        allocation_type: 'percentage',
        percentage: 100,
      })
      if (error) {
        console.error('Failed to create responsibility allocation:', error)
        failedCharges.push(charge.name)
      }
    } else {
      // Split — create both
      const { error } = await supabase.from('responsibility_allocations').insert([
        {
          charge_definition_id: chargeDef.id,
          role: 'tenant',
          allocation_type: 'percentage',
          percentage: charge.tenantPercent,
        },
        {
          charge_definition_id: chargeDef.id,
          role: 'landlord',
          allocation_type: 'percentage',
          percentage: charge.landlordPercent,
        },
      ])
      if (error) {
        console.error('Failed to create responsibility allocations:', error)
        failedCharges.push(charge.name)
      }
    }
  }

  return {
    success: failedCharges.length === 0,
    failedCharges,
  }
}
