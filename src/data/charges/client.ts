'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'

import { createSuspenseHook } from '../shared/create-hook'
import {
  addMonths,
  fetchLedgerMonth,
  fetchPropertyExpenseDefinitions,
  expenseDefinitionsQueryKey,
  type ExpenseDefinitionOption,
  type YearMonth,
} from './shared'

export const useExpenseDefinitions = createSuspenseHook<
  ExpenseDefinitionOption[],
  [propertyId: string]
>(expenseDefinitionsQueryKey, fetchPropertyExpenseDefinitions)

const monthIndex = (ym: YearMonth) => ym.year * 12 + ym.month

/**
 * History pages for "Show earlier months" — one page per calendar month,
 * walking back from the month before `currentMonth` down to `earliestMonth`.
 * Past months are immutable, so pages never go stale.
 */
export function useEarlierLedgerMonths(
  propertyId: string,
  currentMonth: YearMonth,
  earliestMonth: YearMonth,
) {
  return useInfiniteQuery({
    queryKey: ['ledger-earlier-months', propertyId],
    initialPageParam: addMonths(currentMonth, -1),
    queryFn: async ({ pageParam }) => ({
      month: pageParam,
      bills: await fetchLedgerMonth(createClient(), propertyId, pageParam),
    }),
    getNextPageParam: (lastPage) => {
      const next = addMonths(lastPage.month, -1)
      return monthIndex(next) >= monthIndex(earliestMonth) ? next : undefined
    },
    staleTime: Infinity,
  })
}

export type { ExpenseDefinitionOption } from './shared'
