/**
 * Typed mirror of the `create_property` RPC return shape plus the three
 * non-fatal extension fields the server action layers on top after Storage
 * uploads and email sends (see *Server Action Contract* § Flow step 9 in
 * `docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md`).
 *
 * Phase 3 owns the real action and will swap the mock fixture consumer for
 * the action's response. The success-screen UI (Phase 2C) reads from this
 * shape directly.
 *
 * Imports `PropertyType`, `ExpenseType`, and `FileUploadStatus` from the
 * generated database types so the enum sources stay single-rooted; future
 * canonical Zod schemas can re-export the same aliases without forking.
 */

import type { Database } from '@/lib/types/database'

export type PropertyType = Database['public']['Enums']['property_type']
export type ExpenseType = Database['public']['Enums']['expense_type']
export type FileUploadStatus = Database['public']['Enums']['file_upload_status']

export interface SubmitSummaryAddress {
  street: string
  number: string
  complement: string | null
  neighborhood: string | null
  city: string
  state: string
  postal_code: string
  country_code: string
}

export interface SubmitSummaryContract {
  contract_id: string
  storage_path: string
  original_filename: string
  upload_status: FileUploadStatus
  /**
   * Extension field set by the server action when the post-RPC Storage
   * upload pass fails for this contract. Non-fatal — the contract row
   * exists; the file isn't there yet.
   */
  upload_failed?: boolean
}

export interface SubmitSummaryRent {
  rent_id: string
  amount_minor: number
  currency: string
  due_day_of_month: number
  includes: ExpenseType[]
}

export interface SubmitSummaryTenants {
  /** Created with `status = 'pending'` — the action emails these. */
  invited_count: number
  /** Created with `status = 'not_invited'`. */
  deferred_count: number
  /** Pending invitations the action attempted to email. */
  invitations_to_email: string[]
  /**
   * Extension field set by the server action when one or more invite
   * emails failed to dispatch. Non-fatal — invitations were created.
   */
  email_failed_count?: number
}

export interface SubmitSummaryExpenses {
  count: number
  /**
   * Keyed by `ExpenseType`; missing keys default to 0. The RPC returns a
   * sparse object — consumers read with a `?? 0` fallback.
   */
  by_type: Partial<Record<ExpenseType, number>>
  unspecified_count: number
  bundled_count: number
}

export interface SubmitSummaryBillUpload {
  test_bill_id: string
  storage_path: string
  mime_type: string
}

export interface SubmitSummaryProviderRequests {
  /** `null` on idempotent replay — see spec line 852. */
  new_count: number | null
  /** `null` on idempotent replay — see spec line 852. */
  deduped_count: number | null
  bill_uploads: SubmitSummaryBillUpload[]
  /**
   * Extension field set by the server action when one or more bill uploads
   * failed during the post-RPC Storage pass. Non-fatal.
   */
  bill_upload_failed_count?: number
}

export interface SubmitSummary {
  is_idempotent_replay: boolean
  property_id: string
  property_name: string
  property_address: SubmitSummaryAddress
  property_type: PropertyType | null
  unit_id: string
  contract: SubmitSummaryContract | null
  rent: SubmitSummaryRent | null
  tenants: SubmitSummaryTenants
  expenses: SubmitSummaryExpenses
  provider_requests: SubmitSummaryProviderRequests
  /** `true` only on first-write when `profiles.tax_id` was just set. */
  tax_id_updated: boolean
}
