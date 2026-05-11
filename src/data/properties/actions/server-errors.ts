/**
 * Wire types for the property-creation continue and submit actions.
 *
 * Shared by the wizard (client) and the continue / submit server actions.
 * Per-field values inside `FlatFieldErrors` are i18n message keys — the
 * server never returns user-visible strings; translation runs in the
 * section component via `useTranslations`.
 */

import type { SectionId } from '@/app/app/(focused)/p/new/[draftId]/state/registry'

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

/** Wizard-wide codes surfaced as a destructive toast — bypass accordion focus. */
export type GlobalError = {
  code:
    | 'unauthenticated'
    | 'idempotency_owner_mismatch'
    | 'rpc_constraint_violation'
    | 'unknown'
}

/**
 * Phase 3 replaces `any` with the generated RPC return type intersected with
 * the upload/email extension flags. The wizard store does not read summary
 * fields — only the success screen does — so `any` is safe here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubmitSummary = any

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
