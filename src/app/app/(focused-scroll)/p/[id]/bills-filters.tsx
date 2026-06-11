import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { getPropertyExpenseDefinitions } from '@/data/charges/server'
import { expenseDefinitionsQueryKey } from '@/data/charges/shared'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'

import { BillsFilterBar, BillsFilterBarSkeleton } from './bills-filter-bar'

// Prefetch the filter's data server-side and dehydrate it so the client
// `useSuspenseQuery` reads from a warm cache (the browser Supabase client has no
// auth during SSR). The bar fetches its own data; we only hand it `propertyId`.
export function BillsFilters({ propertyId }: { propertyId: string }) {
  return (
    <SuspenseFadeIn fallback={<BillsFilterBarSkeleton />}>
      <BillsFiltersInner propertyId={propertyId} />
    </SuspenseFadeIn>
  )
}

async function BillsFiltersInner({ propertyId }: { propertyId: string }) {
  const queryClient = new QueryClient()
  const definitions = await getPropertyExpenseDefinitions(propertyId)
  queryClient.setQueryData(expenseDefinitionsQueryKey(propertyId), definitions)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BillsFilterBar propertyId={propertyId} />
    </HydrationBoundary>
  )
}
