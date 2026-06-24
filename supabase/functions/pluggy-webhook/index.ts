/**
 * Pluggy webhook receiver.
 *
 * Auth: shared header `X-Webhook-Token` compared (constant-time) against
 * `PLUGGY_WEBHOOK_TOKEN`. Pluggy does not HMAC-sign webhook bodies — see
 * `docs/project/decisions-PRO-61-bank-account-and-payment-matching.md`
 * (Decision 3) for rationale.
 *
 * Dispatch:
 *   • item/{created,updated,login_succeeded}    → bank_items.status='connected'
 *   • item/{error,waiting_user_input}           → bank_items.status='reconnect_required'
 *   • transactions/{created,updated}            → fetch transactions from
 *                                                 Pluggy + apply each via
 *                                                 apply_pluggy_transaction RPC
 *   • anything else                             → log + 202
 *
 * Per-transaction errors are logged and the batch continues. Response status:
 * 202 on success or a partial batch (some transactions written, only
 * per-transaction errors); 5xx when an account's transactions fetch failed
 * (systemic — must retry, even alongside a successful sibling account), when the
 * batch wrote nothing but hit per-transaction errors, or when the handler threw.
 * Retries are safe: the apply RPC upserts on conflict and re-matches only
 * unmatched rows, so a redelivery never double-pays. See the status logic in
 * Deno.serve.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../../src/lib/types/database.ts'

const WEBHOOK_TOKEN = Deno.env.get('PLUGGY_WEBHOOK_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID') ?? ''
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET') ?? ''
// Env-overridable so local e2e tests can point it at a mock Pluggy server
// (scripts/test-payment-matching.sh). Defaults to the real API in production.
const PLUGGY_BASE_URL = Deno.env.get('PLUGGY_BASE_URL') ?? 'https://api.pluggy.ai'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

// -----------------------------------------------------------------------------
// Minimal Pluggy client (replicated for Deno — see src/lib/pluggy/client.ts
// for the Node-side equivalent).
// -----------------------------------------------------------------------------
const ACCESS_TOKEN_TTL_MS = 110 * 60 * 1000
let cachedApiKey: { apiKey: string; expiresAt: number } | null = null

async function pluggyAuth(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now()) {
    return cachedApiKey.apiKey
  }
  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
    throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET not configured')
  }
  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    }),
  })
  if (!res.ok) {
    throw new Error(`Pluggy auth failed (${res.status})`)
  }
  const data = (await res.json()) as { apiKey: string }
  cachedApiKey = { apiKey: data.apiKey, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS }
  return data.apiKey
}

type PluggyTransaction = {
  id: string
  accountId: string
  date: string
  description?: string
  amount: number
  currencyCode: string
  type: 'CREDIT' | 'DEBIT'
  // Pluggy: 'PENDING' (placeholder amount/date, may change) or 'POSTED'
  // (settled). Absent defaults to POSTED. We only act on settled transactions.
  status?: 'PENDING' | 'POSTED'
  paymentData?: {
    payer?: { name?: string; documentNumber?: { type?: string; value?: string } }
    receiver?: { name?: string; documentNumber?: { type?: string; value?: string } }
  } | null
  [key: string]: unknown
}

async function getTransactions(opts: {
  itemId: string
  accountId?: string
  from?: string
  pageSize?: number
}): Promise<PluggyTransaction[]> {
  const apiKey = await pluggyAuth()
  const pageSize = opts.pageSize ?? 200
  const all: PluggyTransaction[] = []
  // Loop pages — a single page caps at pageSize, and on a first sync / busy
  // account anything past page 1 would otherwise be silently dropped (the
  // webhook acks 202, so Pluggy never redelivers the missed rows). Bounded by
  // the response's totalPages and a hard page cap as a safety valve.
  for (let page = 1; page <= 50; page++) {
    const params = new URLSearchParams({ itemId: opts.itemId })
    if (opts.accountId) params.set('accountId', opts.accountId)
    if (opts.from) params.set('from', opts.from)
    params.set('pageSize', String(pageSize))
    params.set('page', String(page))

    const res = await fetch(`${PLUGGY_BASE_URL}/transactions?${params.toString()}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Pluggy /transactions failed (${res.status})`)
    }
    const data = (await res.json()) as {
      results?: PluggyTransaction[]
      totalPages?: number
    }
    all.push(...(data.results ?? []))
    if (!data.totalPages || page >= data.totalPages) break
  }
  return all
}

// Minor-unit exponent per ISO-4217 currency. Most are 2; a few are 0 (JPY, CLP)
// or 3 (BHD, KWD). A bare `* 100` bakes a 2-decimal assumption into money,
// violating the multi-country data-model principle (amount_minor + currency).
// Default 2 covers BRL and everything we expect today; extend as needed.
const CURRENCY_MINOR_EXPONENT: Record<string, number> = {
  BRL: 2,
  USD: 2,
  EUR: 2,
  JPY: 0,
  CLP: 0,
  BHD: 3,
  KWD: 3,
}

// Currency-aware decimal → minor units. Inputs from Pluggy are already at the
// currency's precision, so float * 10^exponent + round is exact in practice.
function toMinorUnits(amount: number, currencyCode: string): number {
  const exponent = CURRENCY_MINOR_EXPONENT[currencyCode?.toUpperCase()] ?? 2
  return Math.round(amount * 10 ** exponent)
}

// -----------------------------------------------------------------------------
// Pluggy → RPC payload shape.
// -----------------------------------------------------------------------------
function toRpcTransaction(tx: PluggyTransaction): Record<string, unknown> {
  return {
    // Full payload first so bank_transactions.raw keeps everything; the derived
    // columns below intentionally override the raw fields they're computed from.
    ...tx,
    id: tx.id,
    date: tx.date,
    amount_minor: toMinorUnits(tx.amount, tx.currencyCode),
    // Normalize to upper-case ISO-4217 — the matcher compares currency
    // case-sensitively against the ledger ('BRL'), and toMinorUnits already
    // resolves its exponent case-insensitively, so a lower-case 'brl' would
    // otherwise compute the right amount yet never match.
    currency: tx.currencyCode?.toUpperCase() ?? tx.currencyCode,
    description: tx.description ?? null,
    counterparty_cpf:
      tx.paymentData?.payer?.documentNumber?.value ??
      tx.paymentData?.receiver?.documentNumber?.value ??
      null,
    counterparty_name:
      tx.paymentData?.payer?.name ?? tx.paymentData?.receiver?.name ?? null,
  }
}

// -----------------------------------------------------------------------------
// Event dispatch.
// -----------------------------------------------------------------------------
type PluggyWebhookBody = {
  event?: string
  itemId?: string
  accountIds?: string[]
  status?: string
  [key: string]: unknown
}

const ITEM_OK_EVENTS = new Set([
  'item/created',
  'item/updated',
  'item/login_succeeded',
])
const ITEM_RECONNECT_EVENTS = new Set([
  'item/error',
  'item/waiting_user_input',
])
const TX_EVENTS = new Set(['transactions/created', 'transactions/updated'])

async function handleItemEvent(
  admin: SupabaseClient<Database>,
  body: PluggyWebhookBody,
): Promise<void> {
  if (!body.itemId) return
  const nextStatus = ITEM_OK_EVENTS.has(body.event ?? '')
    ? 'connected'
    : 'reconnect_required'

  // Update the active row (disconnected_at IS NULL) for this pluggy_item_id.
  const { error } = await admin
    .from('bank_items')
    .update({ status: nextStatus })
    .eq('pluggy_item_id', body.itemId)
    .is('disconnected_at', null)
  if (error) {
    console.error(
      JSON.stringify({ msg: 'pluggy.webhook.item.update_failed', error: error.message }),
    )
  }
}

async function handleTransactionsEvent(
  admin: SupabaseClient<Database>,
  body: PluggyWebhookBody,
): Promise<{ matched: number; processed: number; errors: number; fetchErrors: number }> {
  let matched = 0
  let processed = 0
  // Per-transaction RPC failures (poison messages — retrying the whole batch
  // wouldn't help and risks a storm).
  let errors = 0
  // Per-account transactions-fetch failures (systemic — the transactions were
  // never seen, so the batch must be redelivered). Tracked separately so a
  // failed account on a multi-account item still triggers a retry even when a
  // sibling account succeeded.
  let fetchErrors = 0
  if (!body.itemId) {
    return { matched, processed, errors, fetchErrors }
  }

  // Resolve account ids from the event (preferred) or fall back to all
  // accounts under this item — but only for an item that is still connected.
  // A disconnected (revoked) consent must not keep ingesting transactions.
  let accountIds = body.accountIds ?? []
  if (accountIds.length === 0) {
    const { data: accts } = await admin
      .from('bank_accounts')
      .select('pluggy_account_id, bank_items!inner(pluggy_item_id, disconnected_at)')
      .eq('bank_items.pluggy_item_id', body.itemId)
      .is('bank_items.disconnected_at', null)
    accountIds = (accts ?? []).map((a) => (a as { pluggy_account_id: string }).pluggy_account_id)
  }

  for (const pluggyAccountId of accountIds) {
    // Look up our internal bank_account row from the Pluggy account id.
    const { data: acctRow, error: acctErr } = await admin
      .from('bank_accounts')
      .select('id')
      .eq('pluggy_account_id', pluggyAccountId)
      .maybeSingle()
    if (acctErr || !acctRow) {
      console.error(
        JSON.stringify({
          msg: 'pluggy.webhook.unknown_account',
          pluggy_account_id: pluggyAccountId,
        }),
      )
      continue
    }
    const bankAccountId = (acctRow as { id: string }).id

    let transactions: PluggyTransaction[] = []
    try {
      // Bound the fetch to the last 90 days: the matcher only considers credits
      // within ±10 days of an open due date, so older history is never matchable
      // and re-fetching all of it on every webhook is wasted work.
      const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
      transactions = await getTransactions({
        itemId: body.itemId,
        accountId: pluggyAccountId,
        from,
        pageSize: 200,
      })
    } catch (err) {
      fetchErrors += 1
      console.error(
        JSON.stringify({
          msg: 'pluggy.webhook.fetch_failed',
          pluggy_account_id: pluggyAccountId,
          error: err instanceof Error ? err.message : 'unknown',
        }),
      )
      continue
    }

    for (const tx of transactions) {
      // Skip PENDING placeholders — their amount/date can change on settlement,
      // so matching them risks a confirmed match against a figure that later
      // moves. The settled version arrives as transactions/updated and is
      // processed then. (status absent ⇒ POSTED.)
      if (tx.status === 'PENDING') continue
      try {
        const { data, error } = await admin.rpc('apply_pluggy_transaction', {
          p_bank_account_id: bankAccountId,
          // Cast matches the Node caller (src/data/payments/actions/apply-transaction.ts):
          // the JSONB arg is an open Record, not the generated Json type.
          p_transaction: toRpcTransaction(tx) as never,
        })
        if (error) {
          errors += 1
          console.error(
            JSON.stringify({
              msg: 'pluggy.webhook.rpc_error',
              tx_id: tx.id,
              error: error.message,
            }),
          )
          continue
        }
        processed += 1
        // Count only newly-created matches. 'already_matched' returns
        // matched:true for a settled redelivery of a tx that was already
        // matched, but no new match was made — don't inflate the metric.
        const result = data as { matched?: boolean; reason?: string }
        if (result?.matched && result.reason !== 'already_matched') {
          matched += 1
        }
      } catch (err) {
        errors += 1
        console.error(
          JSON.stringify({
            msg: 'pluggy.webhook.dispatch_failed',
            tx_id: tx.id,
            error: err instanceof Error ? err.message : 'unknown',
          }),
        )
      }
    }
  }
  return { matched, processed, errors, fetchErrors }
}

// -----------------------------------------------------------------------------
// HTTP entry point.
// -----------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 })
  }

  const provided = req.headers.get('x-webhook-token') ?? ''
  if (!WEBHOOK_TOKEN || !constantTimeEqual(provided, WEBHOOK_TOKEN)) {
    return new Response(null, { status: 401 })
  }

  let body: PluggyWebhookBody
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  // Structured log — no PII (event kind + item id only).
  console.log(
    JSON.stringify({
      msg: 'pluggy.webhook.received',
      event: body.event ?? null,
      itemId: body.itemId ?? null,
    }),
  )

  const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    if (body.event && (ITEM_OK_EVENTS.has(body.event) || ITEM_RECONNECT_EVENTS.has(body.event))) {
      await handleItemEvent(admin, body)
    } else if (body.event && TX_EVENTS.has(body.event)) {
      const stats = await handleTransactionsEvent(admin, body)
      console.log(
        JSON.stringify({
          msg: 'pluggy.webhook.transactions.done',
          itemId: body.itemId ?? null,
          ...stats,
        }),
      )
      // A 2xx tells Pluggy delivery succeeded — it will NOT redeliver. Return
      // 5xx so Pluggy redelivers when the failure is systemic and recoverable:
      //   • fetchErrors > 0 — an account's transactions fetch failed, so those
      //     transactions were never seen. This must retry even if a SIBLING
      //     account on the same multi-account item succeeded, or that account's
      //     credits are dropped permanently.
      //   • processed === 0 && errors > 0 — the whole batch hit per-transaction
      //     RPC errors and nothing was written.
      // Re-matching is safe: the apply RPC upserts on conflict and re-runs the
      // matcher only for unmatched rows, so a redelivery never double-pays.
      //
      // A partial batch (some transactions written, only per-transaction errors)
      // is acked: redelivering an otherwise-good batch to re-drive one poison
      // transaction would loop until Pluggy's retry limit (storm). Those
      // failures are captured in the per-transaction error logs above.
      //
      // Pluggy's retry contract (confirmed): a non-2xx is redelivered up to 9
      // times — 3 initial retries, then 6 more with exponential backoff — after
      // which the event is dropped. It does NOT auto-disable the subscription.
      // So 5xx safely buys up to 9 retries; a failure that persists past that is
      // permanently lost (the case a future dead-letter job would catch). The
      // retry request is logged below so persistent failures are observable.
      if (stats.fetchErrors > 0 || (stats.processed === 0 && stats.errors > 0)) {
        console.error(
          JSON.stringify({
            msg: 'pluggy.webhook.retry_requested',
            itemId: body.itemId ?? null,
            reason: stats.fetchErrors > 0 ? 'fetch_failed' : 'all_transactions_failed',
            ...stats,
          }),
        )
        return new Response(null, { status: 503 })
      }
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        msg: 'pluggy.webhook.handler_error',
        error: err instanceof Error ? err.message : 'unknown',
      }),
    )
    // The handler threw before completing, so nothing reliable was written.
    // 5xx so Pluggy redelivers (retry is safe — idempotent inserts).
    return new Response(null, { status: 503 })
  }

  return new Response(null, { status: 202 })
})
