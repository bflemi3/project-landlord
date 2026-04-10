import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchStatement, fetchStatementCharges, fetchMissingCharges } from './shared'
import type { Statement, ChargeInstance, MissingCharge } from './shared'

export const getStatement = cache(async (statementId: string): Promise<Statement> => {
  const supabase = await createClient()
  return fetchStatement(supabase, statementId)
})

export const getStatementCharges = cache(async (statementId: string): Promise<ChargeInstance[]> => {
  const supabase = await createClient()
  return fetchStatementCharges(supabase, statementId)
})

export const getMissingCharges = cache(async (
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<MissingCharge[]> => {
  const supabase = await createClient()
  return fetchMissingCharges(supabase, unitId, statementId, periodYear, periodMonth)
})
