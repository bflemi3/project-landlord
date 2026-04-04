import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface Statement {
  id: string
  unitId: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  currency: string
  publishedAt: string | null
  revision: number
  createdAt: string
  updatedAt: string
}

export async function fetchStatement(supabase: TypedSupabaseClient, statementId: string): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, unit_id, period_year, period_month, status, total_amount_minor, currency, published_at, revision, created_at, updated_at')
    .eq('id', statementId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Statement not found')

  return {
    id: data.id,
    unitId: data.unit_id,
    periodYear: data.period_year,
    periodMonth: data.period_month,
    status: data.status as Statement['status'],
    totalAmountMinor: data.total_amount_minor,
    currency: data.currency,
    publishedAt: data.published_at,
    revision: data.revision,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const statementQueryKey = (id: string) => ['statement', id] as const
