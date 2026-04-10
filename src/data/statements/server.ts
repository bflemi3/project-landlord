import { cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchStatement, fetchStatementCharges, fetchMissingCharges } from './shared'
import type { Statement, ChargeInstance, MissingCharge } from './shared'

export async function getStatement(statementId: string): Promise<Statement> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchStatement(supabase, statementId)
}

export async function getStatementCharges(statementId: string): Promise<ChargeInstance[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchStatementCharges(supabase, statementId)
}

export async function getMissingCharges(
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<MissingCharge[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchMissingCharges(supabase, unitId, statementId, periodYear, periodMonth)
}
