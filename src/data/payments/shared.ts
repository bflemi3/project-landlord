import type { Database } from '@/lib/types/database'

export type MonthlyLedgerEntry = Database['public']['Tables']['monthly_ledger']['Row']
export type BankTransaction = Database['public']['Tables']['bank_transactions']['Row']
export type PaymentMatch = Database['public']['Tables']['payment_matches']['Row']

export type MonthlyLedgerKind = Database['public']['Enums']['monthly_ledger_kind']
export type MonthlyLedgerStatus = Database['public']['Enums']['monthly_ledger_status']
export type PaymentMatchSourceSide =
  Database['public']['Enums']['payment_match_source_side']

/** Shape used by the webhook → apply_pluggy_transaction RPC. */
export type ApplyPluggyTransactionInput = {
  /** Pluggy's transaction id (unique per Pluggy item). */
  id: string
  /** ISO-8601 timestamp. */
  date: string
  /** Signed minor units — positive credit, negative debit. */
  amount_minor: number
  currency: string
  description?: string | null
  counterparty_cpf?: string | null
  counterparty_name?: string | null
  // Pluggy raw fields stored on bank_transactions.raw — anything extra
  // is preserved verbatim.
  [key: string]: unknown
}

export type ApplyPluggyTransactionResult = {
  success: boolean
  matched?: boolean
  ledger_id?: string
  match_id?: string
  reason?: string
}
