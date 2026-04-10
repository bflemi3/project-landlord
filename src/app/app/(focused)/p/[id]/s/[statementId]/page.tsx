import type { Metadata } from 'next'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { statementQueryKey, fetchStatementCharges, statementChargesQueryKey } from '@/data/statements/shared'
import { propertyQueryKey } from '@/data/properties/shared'
import { unitQueryKey } from '@/data/units/shared'
import { getStatement, getProperty, getUnit } from '@/lib/queries/server'
import { fetchMissingCharges, missingChargesQueryKey } from '@/data/statements/shared'
import { StatementDraft } from './statement-draft'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}): Promise<Metadata> {
  const { statementId } = await params
  try {
    const statement = await getStatement(statementId)
    const unit = await getUnit(statement.unitId)
    const period = `${MONTH_SHORT[statement.periodMonth - 1]} ${statement.periodYear}`
    return { title: `${period} Statement — ${unit.name}` }
  } catch {
    return { title: 'Statement' }
  }
}

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}) {
  const { id: propertyId, statementId } = await params
  const supabase = await createClient()
  const queryClient = new QueryClient()

  // Fetch via React.cache (shared with generateMetadata)
  const [statement, property] = await Promise.all([
    getStatement(statementId),
    getProperty(propertyId),
  ])
  const unit = await getUnit(statement.unitId)

  // Seed React Query cache for client hydration
  queryClient.setQueryData(statementQueryKey(statementId), statement)
  queryClient.setQueryData(propertyQueryKey(propertyId), property)
  queryClient.setQueryData(unitQueryKey(statement.unitId), unit)

  // Prefetch remaining data
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: statementChargesQueryKey(statementId),
      queryFn: () => fetchStatementCharges(supabase, statementId),
    }),
    queryClient.prefetchQuery({
      queryKey: missingChargesQueryKey(statement.unitId, statementId),
      queryFn: () => fetchMissingCharges(
        supabase, statement.unitId, statementId,
        statement.periodYear, statement.periodMonth,
      ),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FadeIn className="h-full">
        <StatementDraft statementId={statementId} propertyId={propertyId} />
      </FadeIn>
    </HydrationBoundary>
  )
}
