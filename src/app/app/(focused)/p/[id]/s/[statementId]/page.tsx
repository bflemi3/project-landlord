import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { fetchStatement, statementQueryKey } from '@/lib/queries/statement'
import { fetchStatementCharges, statementChargesQueryKey } from '@/lib/queries/statement-charges'
import { fetchProperty, propertyQueryKey } from '@/lib/queries/property'
import { fetchUnit, unitQueryKey } from '@/lib/queries/unit'
import { fetchMissingCharges, missingChargesQueryKey } from '@/lib/queries/missing-charges'
import { StatementDraft } from './statement-draft'

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}) {
  const { id: propertyId, statementId } = await params
  const supabase = await createClient()
  const queryClient = new QueryClient()

  // Fetch statement first to get unitId and period
  const statement = await queryClient.fetchQuery({
    queryKey: statementQueryKey(statementId),
    queryFn: () => fetchStatement(supabase, statementId),
  })

  // Prefetch all remaining data in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: statementChargesQueryKey(statementId),
      queryFn: () => fetchStatementCharges(supabase, statementId),
    }),
    queryClient.prefetchQuery({
      queryKey: propertyQueryKey(propertyId),
      queryFn: () => fetchProperty(supabase, propertyId),
    }),
    queryClient.prefetchQuery({
      queryKey: unitQueryKey(statement.unitId),
      queryFn: () => fetchUnit(supabase, statement.unitId),
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
