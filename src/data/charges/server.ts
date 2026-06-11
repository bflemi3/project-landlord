import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'
import { getMyPropertyRole } from '@/data/memberships/server'

import {
  fetchPropertyExpenseDefinitions,
  fetchCarryInBills,
  fetchBillsIssuedBetween,
  fetchPaymentsBetween,
  fetchEarliestBillMonth,
  summarizePropertyBills,
  buildCurrentMonthLedger,
  monthStartISO,
  addMonths,
  isInMonth,
  type CurrentMonthLedger,
  type ExpenseDefinitionOption,
  type PropertyBillsSummary,
  type Viewer,
  type YearMonth,
} from './shared'

export const getPropertyExpenseDefinitions = cache(
  async (propertyId: string): Promise<ExpenseDefinitionOption[]> => {
    const supabase = await createClient()
    return fetchPropertyExpenseDefinitions(supabase, propertyId)
  },
)

// "Current month" / "today" for the live view, resolved in the property's
// timezone (BR for now — swap when properties carry their own tz). Day-granular.
function todayISO(timeZone = 'America/Sao_Paulo'): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function currentYearMonth(timeZone?: string): YearMonth {
  const [year, month] = todayISO(timeZone).split('-').map(Number)
  return { year, month }
}

// How many prior months feed the Awaiting rolling average.
const ESTIMATE_WINDOW_MONTHS = 3

/**
 * One request-cached fetch feeding both the summary strip and the ledger —
 * they derive from the same rows, so they can never disagree.
 */
const getPropertyBillsData = cache(async (propertyId: string) => {
  const supabase = await createClient()
  const month = currentYearMonth()
  const today = todayISO()
  const monthStart = monthStartISO(month)
  const nextMonthStart = monthStartISO(addMonths(month, 1))
  const historyStart = monthStartISO(addMonths(month, -ESTIMATE_WINDOW_MONTHS))

  const [activeDefinitions, carryInBills, recentBills, monthPayments, earliestMonth, userId, role] =
    await Promise.all([
      fetchPropertyExpenseDefinitions(supabase, propertyId),
      fetchCarryInBills(supabase, propertyId, monthStart),
      fetchBillsIssuedBetween(supabase, propertyId, historyStart, nextMonthStart),
      fetchPaymentsBetween(supabase, propertyId, monthStart, nextMonthStart),
      fetchEarliestBillMonth(supabase, propertyId),
      getUserId(),
      getMyPropertyRole(propertyId),
    ])

  const viewer: Viewer | null = userId && role ? { userId, role } : null
  const summary = summarizePropertyBills({
    carryInBills,
    recentBills,
    monthPayments,
    activeDefinitions,
    month,
    today,
    viewer,
  })

  return { carryInBills, recentBills, summary, month, today, earliestMonth, viewer }
})

export const getPropertyBillsSummary = cache(
  async (propertyId: string): Promise<PropertyBillsSummary> =>
    (await getPropertyBillsData(propertyId)).summary,
)

export type PropertyLedger = {
  ledger: CurrentMonthLedger
  month: YearMonth
  /** YYYY-MM-DD in the property's tz — the boundary row statuses derive from. */
  today: string
  /** Floor for "Show earlier months"; null = no bills exist at all. */
  earliestMonth: YearMonth | null
}

export const getPropertyLedger = cache(async (propertyId: string): Promise<PropertyLedger> => {
  const { carryInBills, recentBills, summary, month, today, earliestMonth } =
    await getPropertyBillsData(propertyId)
  return {
    ledger: buildCurrentMonthLedger({
      carryInBills,
      monthBills: recentBills.filter((b) => isInMonth(b.issued_on, month)),
      awaitingCharges: summary.awaiting.charges,
      today,
    }),
    month,
    today,
    earliestMonth,
  }
})
