import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

type ExpenseType = Database['public']['Enums']['expense_type']

export type ExpenseDefinitionOption = {
  id: string
  name: string
  expense_type: ExpenseType
}

export const expenseDefinitionsQueryKey = (propertyId: string) =>
  ['expense-definitions', propertyId] as const

/**
 * Active expense definitions configured for a property (across its units).
 * Ordered by name. Also the "expected" universe for the Awaiting stat: every
 * active definition with no instance discovered this month is awaited.
 */
export async function fetchPropertyExpenseDefinitions(
  supabase: TypedSupabaseClient,
  propertyId: string,
): Promise<ExpenseDefinitionOption[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select('id, name, expense_type, units!inner(property_id, deleted_at)')
    .eq('units.property_id', propertyId)
    .is('deleted_at', null)
    .is('units.deleted_at', null)
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    expense_type: row.expense_type,
  }))
}

// -----------------------------------------------------------------------------
// Month arithmetic — string-based (YYYY-MM-DD), no Date/tz parsing. The caller
// resolves "current month" / "today" in the property's timezone.
// -----------------------------------------------------------------------------

export type YearMonth = { year: number; month: number }

const pad2 = (n: number) => String(n).padStart(2, '0')

export const monthStartISO = ({ year, month }: YearMonth): string => `${year}-${pad2(month)}-01`

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = year * 12 + (month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (((zeroBased % 12) + 12) % 12) + 1 }
}

export const isInMonth = (dateISO: string, ym: YearMonth): boolean =>
  dateISO.slice(0, 7) === `${ym.year}-${pad2(ym.month)}`

// -----------------------------------------------------------------------------
// Bills (discovered charge instances + their payments) → the ledger spine.
// -----------------------------------------------------------------------------

export type BillPayment = {
  amount_minor: number
  paid_on: string
  paid_by: string
}

export type BillSplit = {
  userId: string
  percentage: number
}

export type Bill = {
  id: string
  charge_definition_id: string
  name: string
  amount_minor: number
  currency: string
  issued_on: string
  due_date: string | null
  landlord_percentage: number | null
  tenant_percentage: number | null
  payments: BillPayment[]
  splits: BillSplit[]
}

export type Viewer = {
  userId: string
  role: 'landlord' | 'tenant'
}

export const billsSummaryQueryKey = (propertyId: string) => ['bills-summary', propertyId] as const

export const ledgerMonthQueryKey = (propertyId: string, ym: YearMonth) =>
  ['ledger-month', propertyId, ym.year, ym.month] as const

const BILL_SELECT = `id, charge_definition_id, name, amount_minor, currency, issued_on, due_date,
  landlord_percentage, tenant_percentage,
  charge_definitions!inner(units!inner(property_id, deleted_at)),
  charge_payments(amount_minor, paid_on, paid_by),
  tenant_splits(user_id, percentage)`

type BillRow = {
  id: string | null
  charge_definition_id: string | null
  name: string | null
  amount_minor: number | null
  currency: string | null
  issued_on: string | null
  due_date: string | null
  landlord_percentage: number | null
  tenant_percentage: number | null
  charge_payments: { amount_minor: number; paid_on: string; paid_by: string }[] | null
  tenant_splits: { user_id: string; percentage: number }[] | null
}

// The view's generated Row types are all-nullable (postgres-meta can't infer
// not-null through views); base-table columns are non-null in practice.
function mapBillRow(row: BillRow): Bill {
  return {
    id: row.id ?? '',
    charge_definition_id: row.charge_definition_id ?? '',
    name: row.name ?? '',
    amount_minor: row.amount_minor ?? 0,
    currency: row.currency ?? 'BRL',
    issued_on: row.issued_on ?? '',
    due_date: row.due_date,
    landlord_percentage: row.landlord_percentage,
    tenant_percentage: row.tenant_percentage,
    payments: (row.charge_payments ?? []).map((p) => ({
      amount_minor: p.amount_minor,
      paid_on: p.paid_on,
      paid_by: p.paid_by,
    })),
    splits: (row.tenant_splits ?? []).map((s) => ({
      userId: s.user_id,
      percentage: s.percentage,
    })),
  }
}

/**
 * Bills issued in [fromISO, toExclusiveISO), with payments + splits. Used for
 * the current month + rolling-average history window, and (per single month)
 * as the history-pagination page fetch. Newest first; RLS scopes to members.
 */
export async function fetchBillsIssuedBetween(
  supabase: TypedSupabaseClient,
  propertyId: string,
  fromISO: string,
  toExclusiveISO: string,
): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('charge_instances')
    .select(BILL_SELECT)
    .eq('charge_definitions.units.property_id', propertyId)
    .is('charge_definitions.units.deleted_at', null)
    .gte('issued_on', fromISO)
    .lt('issued_on', toExclusiveISO)
    .order('issued_on', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapBillRow)
}

/** Bills for one calendar month — the history-pagination page. */
export function fetchLedgerMonth(
  supabase: TypedSupabaseClient,
  propertyId: string,
  ym: YearMonth,
): Promise<Bill[]> {
  return fetchBillsIssuedBetween(
    supabase,
    propertyId,
    monthStartISO(ym),
    monthStartISO(addMonths(ym, 1)),
  )
}

/**
 * Carry-ins: bills issued before `beforeISO` (the current month) that still
 * have an outstanding balance — however old. Selected via the payment-state
 * view (outstanding is a cross-table aggregate PostgREST can't filter on).
 */
export async function fetchCarryInBills(
  supabase: TypedSupabaseClient,
  propertyId: string,
  beforeISO: string,
): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('charge_instances_with_payment_state')
    .select(BILL_SELECT)
    .eq('charge_definitions.units.property_id', propertyId)
    .is('charge_definitions.units.deleted_at', null)
    .gt('outstanding_minor', 0)
    .lt('issued_on', beforeISO)
    .order('issued_on', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapBillRow)
}

/**
 * All payments dated within [fromISO, toExclusiveISO) across the property —
 * regardless of which month's bill they settle. The Paid stat is a payments
 * query, so settling an old carry-in this month lands in this month's Paid.
 */
export async function fetchPaymentsBetween(
  supabase: TypedSupabaseClient,
  propertyId: string,
  fromISO: string,
  toExclusiveISO: string,
): Promise<BillPayment[]> {
  const { data, error } = await supabase
    .from('charge_payments')
    .select(
      `amount_minor, paid_on, paid_by,
       charge_instances!inner(charge_definitions!inner(units!inner(property_id, deleted_at)))`,
    )
    .eq('charge_instances.charge_definitions.units.property_id', propertyId)
    .is('charge_instances.charge_definitions.units.deleted_at', null)
    .gte('paid_on', fromISO)
    .lt('paid_on', toExclusiveISO)

  if (error) throw error
  return (data ?? []).map((p) => ({
    amount_minor: p.amount_minor,
    paid_on: p.paid_on,
    paid_by: p.paid_by,
  }))
}

/**
 * Month of the property's oldest bill — the floor for "Show earlier months"
 * paging. Null when the property has no bills yet.
 */
export async function fetchEarliestBillMonth(
  supabase: TypedSupabaseClient,
  propertyId: string,
): Promise<YearMonth | null> {
  const { data, error } = await supabase
    .from('charge_instances')
    .select('issued_on, charge_definitions!inner(units!inner(property_id, deleted_at))')
    .eq('charge_definitions.units.property_id', propertyId)
    .is('charge_definitions.units.deleted_at', null)
    .order('issued_on', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const [year, month] = data.issued_on.split('-').map(Number)
  return { year, month }
}

// -----------------------------------------------------------------------------
// Pure money derivations.
// -----------------------------------------------------------------------------

export const billPaidMinor = (bill: Bill): number =>
  bill.payments.reduce((sum, p) => sum + p.amount_minor, 0)

/** Unpaid remainder, floored at 0 so overpayment never goes negative. */
export const billOutstandingMinor = (bill: Bill): number =>
  Math.max(0, bill.amount_minor - billPaidMinor(bill))

/** Overdue = still owed and past due. NULL due_date never auto-overdues. */
export const isBillOverdue = (bill: Bill, todayISO: string): boolean =>
  billOutstandingMinor(bill) > 0 && bill.due_date !== null && bill.due_date < todayISO

/**
 * The viewer's responsibility share of a bill (minor units). Landlord → their
 * `landlord_percentage`; tenant → `tenant_percentage` scaled by their
 * `tenant_splits` row (no split rows ⇒ this tenant covers the whole tenant
 * portion; rows present but none theirs ⇒ zero).
 */
function viewerShareMinor(bill: Bill, viewer: Viewer): number {
  if (viewer.role === 'landlord') {
    return Math.round((bill.amount_minor * (bill.landlord_percentage ?? 0)) / 10000)
  }

  const tenantPortion = (bill.amount_minor * (bill.tenant_percentage ?? 0)) / 10000
  if (bill.splits.length === 0) return Math.round(tenantPortion)
  const mine = bill.splits.find((s) => s.userId === viewer.userId)
  return mine ? Math.round((tenantPortion * mine.percentage) / 100) : 0
}

/**
 * What the viewer still owes on a bill: their share minus their own payments,
 * capped by the bill's outstanding (if the other side settled it, nobody owes).
 */
function viewerOutstandingMinor(bill: Bill, viewer: Viewer): number {
  const ownPaid = bill.payments
    .filter((p) => p.paid_by === viewer.userId)
    .reduce((sum, p) => sum + p.amount_minor, 0)
  return Math.min(Math.max(0, viewerShareMinor(bill, viewer) - ownPaid), billOutstandingMinor(bill))
}

// -----------------------------------------------------------------------------
// Ledger rows — status + current-month grouping.
// -----------------------------------------------------------------------------

export type LedgerBillStatus = 'paid' | 'overdue' | 'due'

/**
 * Row status for a real (discovered) bill. Synthetic expected rows are
 * "awaiting" by construction and never pass through here. Partial payments
 * stay due/overdue; NULL due_date renders due and never auto-overdues.
 */
export function ledgerBillStatus(bill: Bill, todayISO: string): LedgerBillStatus {
  if (billOutstandingMinor(bill) === 0) return 'paid'
  return isBillOverdue(bill, todayISO) ? 'overdue' : 'due'
}

export type CurrentMonthLedger = {
  overdue: Bill[]
  due: Bill[]
  awaiting: AwaitingCharge[]
  paid: Bill[]
}

const byDueDateAsc = (a: Bill, b: Bill): number => {
  if (a.due_date === b.due_date) return a.issued_on.localeCompare(b.issued_on)
  if (a.due_date === null) return 1
  if (b.due_date === null) return -1
  return a.due_date.localeCompare(b.due_date)
}

/**
 * The live section's row groups, in display order: Overdue → Due → Awaiting
 * (synthetic) → Paid. Carry-ins join the current month's bills; urgency sorts
 * by due date (NULLs last), settled bills newest first.
 */
export function buildCurrentMonthLedger({
  carryInBills,
  monthBills,
  awaitingCharges,
  today,
}: {
  carryInBills: Bill[]
  monthBills: Bill[]
  awaitingCharges: AwaitingCharge[]
  today: string
}): CurrentMonthLedger {
  const unique = new Map<string, Bill>()
  for (const bill of [...carryInBills, ...monthBills]) unique.set(bill.id, bill)

  const groups: CurrentMonthLedger = { overdue: [], due: [], awaiting: awaitingCharges, paid: [] }
  for (const bill of unique.values()) groups[ledgerBillStatus(bill, today)].push(bill)

  groups.overdue.sort(byDueDateAsc)
  groups.due.sort(byDueDateAsc)
  groups.paid.sort((a, b) => b.issued_on.localeCompare(a.issued_on))
  return groups
}

// -----------------------------------------------------------------------------
// Summary — Due · Paid · Awaiting (+ overdue layer). Pure and month/today-
// explicit so it's testable and tz-correct.
// -----------------------------------------------------------------------------

export type SideTotals = {
  /** Concrete unpaid bills: current month + carry-ins. Never estimates. */
  dueMinor: number
  /** The subset of due that's past its due_date. */
  overdueMinor: number
  /** Payments dated this month, whichever month's bill they settle. */
  paidMinor: number
}

export type ViewerTotals = SideTotals & {
  /** True when the viewer holds a share (>0) of any concrete bill in view. */
  hasResponsibility: boolean
}

export type AwaitingCharge = {
  definitionId: string
  name: string
  /** Average of the prior 3 months' totals; null = no history ("unknown"). */
  estimateMinor: number | null
}

export type OverdueBill = {
  id: string
  name: string
  issuedOn: string
  dueDate: string
  outstandingMinor: number
  viewerOutstandingMinor: number | null
}

export type PropertyBillsSummary = {
  property: SideTotals
  viewer: ViewerTotals | null
  awaiting: {
    count: number
    /** Sum of the known estimates (0 when none known). */
    estimateMinor: number
    hasUnknown: boolean
    charges: AwaitingCharge[]
  }
  /** Sources for the overdue banner, oldest first. */
  overdueBills: OverdueBill[]
  currency: string
}

export type SummarizeInput = {
  /** Issued before `month`, outstanding > 0 (from fetchCarryInBills). */
  carryInBills: Bill[]
  /** Issued in [month − 3, month + 1) — current month + estimate history. */
  recentBills: Bill[]
  /** Payments dated within `month`, property-wide. */
  monthPayments: BillPayment[]
  activeDefinitions: ExpenseDefinitionOption[]
  month: YearMonth
  /** YYYY-MM-DD in the property's timezone — the overdue boundary. */
  today: string
  viewer: Viewer | null
  fallbackCurrency?: string
}

/** Average of per-month totals across months that have data; null when none. */
function estimateFromHistory(history: Bill[]): number | null {
  if (history.length === 0) return null
  const byMonth = new Map<string, number>()
  for (const bill of history) {
    const key = bill.issued_on.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + bill.amount_minor)
  }
  let total = 0
  for (const monthTotal of byMonth.values()) total += monthTotal
  return Math.round(total / byMonth.size)
}

export function summarizePropertyBills({
  carryInBills,
  recentBills,
  monthPayments,
  activeDefinitions,
  month,
  today,
  viewer,
  fallbackCurrency = 'BRL',
}: SummarizeInput): PropertyBillsSummary {
  const monthBills = recentBills.filter((b) => isInMonth(b.issued_on, month))
  const monthStart = monthStartISO(month)
  const historyBills = recentBills.filter((b) => b.issued_on < monthStart)

  // Dedupe defensively — a carry-in can never be a month bill, but ids are cheap.
  const concrete = new Map<string, Bill>()
  for (const bill of [...carryInBills, ...monthBills]) concrete.set(bill.id, bill)
  const concreteBills = [...concrete.values()]

  const property: SideTotals = { dueMinor: 0, overdueMinor: 0, paidMinor: 0 }
  let viewerDue = 0
  let viewerOverdue = 0
  let hasResponsibility = false
  const overdueBills: OverdueBill[] = []

  for (const bill of concreteBills) {
    const outstanding = billOutstandingMinor(bill)
    property.dueMinor += outstanding

    const overdue = isBillOverdue(bill, today)
    if (overdue) property.overdueMinor += outstanding

    if (viewer) {
      if (viewerShareMinor(bill, viewer) > 0) hasResponsibility = true
      const ownOutstanding = viewerOutstandingMinor(bill, viewer)
      viewerDue += ownOutstanding
      if (overdue) viewerOverdue += ownOutstanding
    }

    if (overdue && bill.due_date) {
      overdueBills.push({
        id: bill.id,
        name: bill.name,
        issuedOn: bill.issued_on,
        dueDate: bill.due_date,
        outstandingMinor: outstanding,
        viewerOutstandingMinor: viewer ? viewerOutstandingMinor(bill, viewer) : null,
      })
    }
  }
  overdueBills.sort((a, b) => a.issuedOn.localeCompare(b.issuedOn))

  for (const payment of monthPayments) property.paidMinor += payment.amount_minor

  let viewerTotals: ViewerTotals | null = null
  if (viewer) {
    const viewerPaid = monthPayments
      .filter((p) => p.paid_by === viewer.userId)
      .reduce((sum, p) => sum + p.amount_minor, 0)
    viewerTotals = {
      dueMinor: viewerDue,
      overdueMinor: viewerOverdue,
      paidMinor: viewerPaid,
      hasResponsibility,
    }
  }

  const seenDefinitions = new Set(monthBills.map((b) => b.charge_definition_id))
  const charges: AwaitingCharge[] = activeDefinitions
    .filter((def) => !seenDefinitions.has(def.id))
    .map((def) => ({
      definitionId: def.id,
      name: def.name,
      estimateMinor: estimateFromHistory(
        historyBills.filter((b) => b.charge_definition_id === def.id),
      ),
    }))

  return {
    property,
    viewer: viewerTotals,
    awaiting: {
      count: charges.length,
      estimateMinor: charges.reduce((sum, c) => sum + (c.estimateMinor ?? 0), 0),
      hasUnknown: charges.some((c) => c.estimateMinor === null),
      charges,
    },
    overdueBills,
    currency: concreteBills[0]?.currency ?? recentBills[0]?.currency ?? fallbackCurrency,
  }
}
