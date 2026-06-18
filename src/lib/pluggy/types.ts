/**
 * Minimal Pluggy API types covering only the fields we read.
 * Reference: https://docs.pluggy.ai/reference
 */

export type PluggyItemStatus =
  | 'CREATED'
  | 'UPDATING'
  | 'LOGIN_IN_PROGRESS'
  | 'WAITING_USER_INPUT'
  | 'WAITING_USER_ACTION'
  | 'UPDATED'
  | 'OUTDATED'
  | 'ERROR'
  | 'LOGIN_ERROR'
  | 'MERGING'
  | 'DELETED'

export type PluggyItem = {
  id: string
  status: PluggyItemStatus
  connector: {
    id: number
    name: string
    institutionUrl?: string
    imageUrl?: string
    primaryColor?: string
    country?: string
  }
}

export type PluggyAccount = {
  id: string
  type: string
  subtype?: string | null
  name: string
  marketingName?: string | null
  number?: string | null
  currencyCode: string
}

export type PluggyConnectTokenResponse = {
  accessToken: string
}

export type PluggyAuthResponse = {
  apiKey: string
}

export type PluggyAccountsResponse = {
  results: PluggyAccount[]
}

/**
 * Subset of fields the matcher reads. Pluggy returns more — full payload is
 * stored on `bank_transactions.raw` for audit. See
 * `docs/research/pluggy-transaction-shape.md`.
 */
export type PluggyTransaction = {
  id: string
  accountId: string
  /** ISO-8601 timestamp. */
  date: string
  description: string
  descriptionRaw?: string | null
  /** Account currency value; positive credit, negative debit. */
  amount: number
  amountInAccountCurrency?: number | null
  currencyCode: string
  type: 'CREDIT' | 'DEBIT'
  status?: 'POSTED' | 'PENDING'
  category?: string | null
  categoryId?: string | null
  balance?: number | null
  providerCode?: string | null
  paymentData?: PluggyPaymentData | null
}

export type PluggyPaymentData = {
  paymentMethod?: 'PIX' | 'TED' | 'DOC' | 'BOLETO' | string
  reason?: string | null
  referenceNumber?: string | null
  payer?: PluggyCounterparty | null
  receiver?: PluggyCounterparty | null
}

export type PluggyCounterparty = {
  name?: string | null
  documentNumber?: {
    type?: 'CPF' | 'CNPJ' | string
    value?: string | null
  } | null
  accountNumber?: string | null
  branchNumber?: string | null
  routingNumber?: string | null
}

export type PluggyTransactionsResponse = {
  results: PluggyTransaction[]
  total?: number
  totalPages?: number
  page?: number
}

/**
 * Pluggy webhook event envelope. We discriminate on `event` and read only
 * the fields used by the handler (`itemId`, `accountIds`, `status`).
 */
export type PluggyWebhookEvent =
  | {
      event:
        | 'item/created'
        | 'item/updated'
        | 'item/login_succeeded'
      itemId: string
    }
  | {
      event: 'item/error' | 'item/waiting_user_input'
      itemId: string
      status?: PluggyItemStatus
    }
  | {
      event: 'transactions/created' | 'transactions/updated'
      itemId: string
      accountIds?: string[]
    }
  | {
      // Anything else — we accept and log, but do not act.
      event: string
      itemId?: string
      [key: string]: unknown
    }
