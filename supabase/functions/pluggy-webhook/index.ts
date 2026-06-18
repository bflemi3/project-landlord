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
 * Per-transaction errors are logged and the batch continues — Pluggy retries
 * are safe because the RPC is idempotent on (bank_account_id, pluggy_transaction_id).
 */

import { createClient } from '@supabase/supabase-js'

const WEBHOOK_TOKEN = Deno.env.get('PLUGGY_WEBHOOK_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID') ?? ''
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET') ?? ''
const PLUGGY_BASE_URL = 'https://api.pluggy.ai'

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
  const params = new URLSearchParams({ itemId: opts.itemId })
  if (opts.accountId) params.set('accountId', opts.accountId)
  if (opts.from) params.set('from', opts.from)
  params.set('pageSize', String(opts.pageSize ?? 200))

  const apiKey = await pluggyAuth()
  const res = await fetch(`${PLUGGY_BASE_URL}/transactions?${params.toString()}`, {
    method: 'GET',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Pluggy /transactions failed (${res.status})`)
  }
  const data = (await res.json()) as { results: PluggyTransaction[] }
  return data.results ?? []
}

// -----------------------------------------------------------------------------
// Pluggy → RPC payload shape.
// -----------------------------------------------------------------------------
function toRpcTransaction(tx: PluggyTransaction): Record<string, unknown> {
  return {
    // Persisted columns
    id: tx.id,
    date: tx.date,
    amount_minor: Math.round(tx.amount * 100),
    currency: tx.currencyCode,
    description: tx.description ?? null,
    counterparty_cpf:
      tx.paymentData?.payer?.documentNumber?.value ??
      tx.paymentData?.receiver?.documentNumber?.value ??
      null,
    counterparty_name:
      tx.paymentData?.payer?.name ?? tx.paymentData?.receiver?.name ?? null,
    // Full payload retained on bank_transactions.raw
    ...tx,
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
  admin: ReturnType<typeof createClient>,
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
  admin: ReturnType<typeof createClient>,
  body: PluggyWebhookBody,
): Promise<{ matched: number; processed: number; errors: number }> {
  let matched = 0
  let processed = 0
  let errors = 0
  if (!body.itemId) {
    return { matched, processed, errors }
  }

  // Resolve account ids from the event (preferred) or fall back to all
  // accounts under this item.
  let accountIds = body.accountIds ?? []
  if (accountIds.length === 0) {
    const { data: accts } = await admin
      .from('bank_accounts')
      .select('pluggy_account_id, bank_items!inner(pluggy_item_id)')
      .eq('bank_items.pluggy_item_id', body.itemId)
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
      transactions = await getTransactions({
        itemId: body.itemId,
        accountId: pluggyAccountId,
        pageSize: 200,
      })
    } catch (err) {
      errors += 1
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
      try {
        const { data, error } = await admin.rpc('apply_pluggy_transaction', {
          p_bank_account_id: bankAccountId,
          p_transaction: toRpcTransaction(tx),
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
        if ((data as { matched?: boolean })?.matched) {
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
  return { matched, processed, errors }
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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
    }
  } catch (err) {
    // Log and 202 anyway — Pluggy retries are safe (idempotent inserts).
    console.error(
      JSON.stringify({
        msg: 'pluggy.webhook.handler_error',
        error: err instanceof Error ? err.message : 'unknown',
      }),
    )
  }

  return new Response(null, { status: 202 })
})
