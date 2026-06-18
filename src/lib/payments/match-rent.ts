/**
 * Pure rent-matching logic. Single source of truth that mirrors the SQL
 * candidate logic in `apply_pluggy_transaction` (see
 * `supabase/migrations/20260610120000_payment_matching_foundation.sql`).
 *
 * Rules (Decision 4):
 *   - amount-exact match (same minor units, same currency)
 *   - |posted_at − due_date| ≤ 10 days
 *   - exactly one candidate survives → match; 0 or >1 → null (ambiguous)
 *
 * Used directly by tests as the reference; not invoked from the webhook
 * itself (the RPC is the production matcher, this is the spec it implements).
 */

export type LedgerCandidate = {
  id: string
  amount_minor: number
  currency: string
  /** YYYY-MM-DD. */
  due_date: string
}

export type RentTransactionInput = {
  amount_minor: number
  currency: string
  /** ISO-8601 timestamp. */
  posted_at: string
}

export const MATCH_WINDOW_DAYS = 10

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  return Math.abs(a - b) / (24 * 60 * 60 * 1000)
}

export function matchRentCredit(input: {
  transaction: RentTransactionInput
  candidates: LedgerCandidate[]
}): LedgerCandidate | null {
  const { transaction, candidates } = input

  const survivors = candidates.filter((c) => {
    if (c.currency !== transaction.currency) return false
    if (c.amount_minor !== transaction.amount_minor) return false
    // Compare against the due_date as a date — treat as midnight UTC, then
    // measure full days. The SQL side does `abs(due_date - posted_at::date)`
    // which is in days; both implementations agree at the day boundary.
    const dueIso = `${c.due_date}T00:00:00Z`
    const txDate = transaction.posted_at.slice(0, 10) + 'T00:00:00Z'
    return daysBetween(dueIso, txDate) <= MATCH_WINDOW_DAYS
  })

  return survivors.length === 1 ? survivors[0] : null
}
