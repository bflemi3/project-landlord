// Server-only by convention: all consumers are server actions ('use server')
// or server fetchers (React.cache). Env vars are server-side and the credential
// check in getCreds() throws if accidentally imported into a client bundle.

import type {
  PluggyAccount,
  PluggyAccountsResponse,
  PluggyAuthResponse,
  PluggyConnectTokenResponse,
  PluggyItem,
  PluggyTransaction,
  PluggyTransactionsResponse,
} from './types'

const PLUGGY_BASE_URL = 'https://api.pluggy.ai'

// Pluggy API keys live ~2h. Refresh slightly early so an in-flight request
// never races the expiry. Module-scoped — safe across requests within the
// same Node process; multiple instances each mint their own.
const ACCESS_TOKEN_TTL_MS = 110 * 60 * 1000

type CachedToken = { apiKey: string; expiresAt: number }
let cached: CachedToken | null = null

function getCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'Pluggy credentials missing. Set PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET in .env.local.',
    )
  }
  return { clientId, clientSecret }
}

async function pluggyFetch(
  path: string,
  init: RequestInit & { auth?: false } = {},
): Promise<Response> {
  const { auth, headers, ...rest } = init
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }
  if (auth !== false) {
    finalHeaders['X-API-KEY'] = await getApiKey()
  }
  return fetch(`${PLUGGY_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    cache: 'no-store',
  })
}

/**
 * Mint (or return cached) Pluggy API key. Server-only.
 */
export async function getApiKey(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.apiKey
  }
  const { clientId, clientSecret } = getCreds()
  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await safeReadText(res)
    throw new Error(`Pluggy auth failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as PluggyAuthResponse
  cached = { apiKey: data.apiKey, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS }
  return data.apiKey
}

/**
 * Mint a short-lived connect_token the browser hands to the Pluggy Connect widget.
 * Pass `itemId` to enter update / reconnect mode for an existing item.
 *
 * Always pass `clientUserId` (our own user id). Pluggy stamps it onto every
 * item created/updated with this token, so on ingest we can verify the item
 * actually belongs to the caller (`registerPluggyItem`). Without it, any item
 * id is registerable by any authenticated user — see the ownership check there.
 */
export async function createConnectToken(
  options: { itemId?: string; clientUserId?: string } = {},
): Promise<PluggyConnectTokenResponse> {
  const body: Record<string, string> = {}
  if (options.itemId) body.itemId = options.itemId
  if (options.clientUserId) body.clientUserId = options.clientUserId
  const res = await pluggyFetch('/connect_token', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `Pluggy connect_token failed (${res.status}): ${await safeReadText(res)}`,
    )
  }
  return (await res.json()) as PluggyConnectTokenResponse
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  const res = await pluggyFetch(`/items/${itemId}`, { method: 'GET' })
  if (!res.ok) {
    throw new Error(
      `Pluggy GET /items/${itemId} failed (${res.status}): ${await safeReadText(res)}`,
    )
  }
  return (await res.json()) as PluggyItem
}

export async function getAccounts(itemId: string): Promise<PluggyAccount[]> {
  const res = await pluggyFetch(`/accounts?itemId=${encodeURIComponent(itemId)}`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error(
      `Pluggy GET /accounts failed (${res.status}): ${await safeReadText(res)}`,
    )
  }
  const data = (await res.json()) as PluggyAccountsResponse
  return data.results
}

/**
 * Fetch transactions for a Pluggy item (optionally scoped to one account and
 * a date range). Called by the Pluggy webhook handler on `transactions/*`
 * events. Pagination is one page at a time — callers paginate via `page`.
 */
export async function getTransactions(
  itemId: string,
  opts: {
    accountId?: string
    from?: string // YYYY-MM-DD
    to?: string // YYYY-MM-DD
    pageSize?: number
    page?: number
  } = {},
): Promise<PluggyTransaction[]> {
  const params = new URLSearchParams({ itemId })
  if (opts.accountId) params.set('accountId', opts.accountId)
  if (opts.from) params.set('from', opts.from)
  if (opts.to) params.set('to', opts.to)
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts.page) params.set('page', String(opts.page))

  const res = await pluggyFetch(`/transactions?${params.toString()}`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error(
      `Pluggy GET /transactions failed (${res.status}): ${await safeReadText(res)}`,
    )
  }
  const data = (await res.json()) as PluggyTransactionsResponse
  return data.results
}

/**
 * Best-effort revoke. Returns true on 2xx, false otherwise — callers should
 * not block UX on the revoke result; the row is already soft-deleted in our DB.
 */
export async function deleteItem(itemId: string): Promise<boolean> {
  const res = await pluggyFetch(`/items/${itemId}`, { method: 'DELETE' })
  return res.ok
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return '<unreadable body>'
  }
}

/**
 * Test-only: reset the cached API key. Exported so unit tests can assert
 * cache behavior without restarting the module.
 */
export function __resetPluggyClientForTests(): void {
  cached = null
}
