'use server'

import { createClient } from '@/lib/supabase/server'
import {
  createChargesCore,
  type ChargeInput,
  type ExpenseTypeInput,
  type AmountBehaviorInput,
} from '@/data/units/actions/create-charges'

export interface SaveChargeDefinitionInput {
  unitId: string
  name: string
  expenseType: ExpenseTypeInput
  amountBehavior: AmountBehaviorInput
  amountMinor: number | null
  payer: 'tenant' | 'landlord' | 'split'
  splitMode?: 'percent' | 'amount'
  tenantPercent: number
  landlordPercent: number
  tenantFixedMinor?: number
  landlordFixedMinor?: number
}

export async function saveChargeAsDefinition(input: SaveChargeDefinitionInput): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const charge: ChargeInput = {
    name: input.name,
    expenseType: input.expenseType,
    amountBehavior: input.amountBehavior,
    amountMinor: input.amountMinor,
    payer: input.payer,
    splitMode: input.splitMode,
    tenantPercent: input.tenantPercent,
    landlordPercent: input.landlordPercent,
    tenantFixedMinor: input.tenantFixedMinor,
    landlordFixedMinor: input.landlordFixedMinor,
  }

  const result = await createChargesCore(supabase, input.unitId, [charge])
  return { success: result.success }
}
