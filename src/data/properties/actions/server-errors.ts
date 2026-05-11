/**
 * Wire types for the property-creation continue and submit actions.
 *
 * Shared by the wizard (client) and the continue / submit server actions.
 * Per-field values inside `FlatFieldErrors` are i18n message keys — the
 * server never returns user-visible strings; translation runs in the
 * section component via `useTranslations`.
 */

import type { SectionId } from '@/app/app/(focused)/p/new/[draftId]/state/registry'
import type { Database } from '@/lib/types/database'

/** `z.flattenError(error).fieldErrors` shape for one form scope. */
export type FlatFieldErrors = Record<string, string[]>

/**
 * Flat sections (property, rent-dates, tax-id, bank) emit `FlatFieldErrors`.
 * Row sections (expenses, tenants) emit a per-row map keyed by stable row
 * `id` so row deletes don't shift sibling errors.
 */
export type SectionServerErrors =
  | FlatFieldErrors
  | Record<string /* rowId */, FlatFieldErrors>

/**
 * Wizard-wide codes surfaced as a destructive toast — bypass accordion focus.
 *
 * `duplicate_address` carries the existing property's id so the toast can
 * offer a "View existing property" deep-link. Other codes have no payload.
 */
export type GlobalError =
  | { code: 'unauthenticated' }
  | { code: 'idempotency_owner_mismatch' }
  | { code: 'rpc_constraint_violation' }
  | { code: 'unknown' }
  | { code: 'duplicate_address'; data?: { existingPropertyId?: string } }
  | { code: 'contract_validation_failed' }

// ---------------------------------------------------------------------------
// SubmitSummary — the typed shape returned by `createProperty` on
// `{ ok: true }`. Mirrors the `create_property` RPC return shape plus the
// three non-fatal extension flags the server action layers on after Storage
// uploads and email sends (spec § Server Action Contract, Flow step 9).
// Read directly by the success screen; the wizard store doesn't read its
// fields, just forwards the value through `ServerErrorsResponse`.
// ---------------------------------------------------------------------------

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
  /** Set by the server action when the post-RPC contract upload fails. Non-fatal. */
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
  invited_count: number
  deferred_count: number
  invitations_to_email: string[]
  /** Set by the server action when one or more invite emails fail. Non-fatal. */
  email_failed_count?: number
}

export interface SubmitSummaryExpenses {
  count: number
  /** Sparse — missing keys default to 0. Consumers read with `?? 0`. */
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
  /** `null` on idempotent replay. */
  new_count: number | null
  /** `null` on idempotent replay. */
  deduped_count: number | null
  bill_uploads: SubmitSummaryBillUpload[]
  /** Set by the server action when one or more bill uploads fail. Non-fatal. */
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

/**
 * Envelope every continue action and the final submit action returns.
 * Continue actions: `{ ok: true }` on success; `{ ok: false, sectionErrors }`
 * with at most one section's slice on failure. Submit action: same shape,
 * with `summary` on success and possibly many section keys on failure.
 */
export type ServerErrorsResponse =
  | { ok: true; summary?: SubmitSummary }
  | {
      ok: false
      sectionErrors?: Partial<Record<SectionId, SectionServerErrors>>
      globalErrors?: GlobalError[]
    }
