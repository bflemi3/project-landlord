'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { generateAndPersistInstancesCore } from './generate-instances'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'

export interface CreateStatementResult {
  success: boolean
  statementId?: string
  error?: string
}

export async function createStatementCore(
  supabase: TypedSupabaseClient,
  unitId: string,
  periodYear: number,
  periodMonth: number,
): Promise<CreateStatementResult> {
  // Check for existing statement in this period
  const { data: existing } = await supabase
    .from('statements')
    .select('id')
    .eq('unit_id', unitId)
    .eq('period_year', periodYear)
    .eq('period_month', periodMonth)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Statement already exists for this period' }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get unit currency
  const { data: unit } = await supabase
    .from('units')
    .select('currency')
    .eq('id', unitId)
    .single()

  const currency = unit?.currency ?? 'BRL'

  // Create the statement
  const { data: statement, error: createError } = await supabase
    .from('statements')
    .insert({
      unit_id: unitId,
      period_year: periodYear,
      period_month: periodMonth,
      status: 'draft',
      total_amount_minor: 0,
      currency,
      created_by: user.id,
      revision: 1,
    })
    .select('id')
    .single()

  if (createError || !statement) {
    return { success: false, error: createError?.message ?? 'Failed to create statement' }
  }

  // Generate charge instances from definitions
  await generateAndPersistInstancesCore(
    supabase, unitId, statement.id, periodYear, periodMonth,
  )

  // Recalculate total from generated instances
  await recalculateStatementTotal(supabase, statement.id)

  return { success: true, statementId: statement.id }
}

export async function createStatement(
  unitId: string,
  periodYear: number,
  periodMonth: number,
  propertyId?: string,
): Promise<CreateStatementResult> {
  const supabase = await createClient()
  const result = await createStatementCore(supabase, unitId, periodYear, periodMonth)
  if (result.success && result.statementId) {
    revalidatePath(
      propertyId ? `/app/p/${propertyId}/s/${result.statementId}` : '/app',
      propertyId ? undefined : 'layout',
    )
  }
  return result
}
