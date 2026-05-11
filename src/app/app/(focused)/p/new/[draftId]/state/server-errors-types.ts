/**
 * Wire types for the property-creation server-error envelope.
 *
 * Mirrors the *Server Action Contract — Error envelope* in
 * `docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md`.
 *
 * Phase 2B declares these locally so the wizard store and continue actions
 * can compile against a stable shape. Phase 3's submit server action
 * (`submitPropertyCreation`) will re-export from here or supersede with a
 * canonical declaration colocated with the action and its error catalogue.
 *
 * Per-field values inside `FlatFieldErrors` are i18n message keys, not
 * user-visible strings — translation happens at the section call site via
 * `useTranslations`.
 */

import type { SectionId } from './registry'

/** Mirrors `z.flattenError(error).fieldErrors` for one form scope. */
export type FlatFieldErrors = Record<string, string[]>

/**
 * Single-form section ('property', 'rent-dates', 'tax-id', 'bank'): a flat
 * `FlatFieldErrors`. Row sections ('expenses', 'tenants'): a per-row map
 * keyed by the stable row `id`, never index — row delete must not shift
 * other rows' errors.
 */
export type SectionServerErrors =
  | FlatFieldErrors
  | Record<string /* rowId */, FlatFieldErrors>

/** Wizard-wide error codes. The frontend maps each `code` to an i18n key
 *  under `propertyCreation.errors.*` and surfaces them via a destructive
 *  toast — they bypass per-section accordion focus. */
export type GlobalError = {
  code:
    | 'unauthenticated'
    | 'idempotency_owner_mismatch'
    | 'rpc_constraint_violation'
    | 'unknown'
}

/**
 * Phase 3 will replace `any` with the generated RPC return type intersected
 * with the upload/email extension flags described in *Server Action Contract*
 * § Flow step 9. The wizard store does not read summary fields — only the
 * success screen does — so `any` is safe here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubmitSummary = any

/**
 * Shared envelope returned by every continue action and the final submit
 * action. Continue actions return `{ ok: true }` only (no `summary`) on
 * success; the submit action returns `{ ok: true; summary }`.
 *
 * On `ok: false`:
 *   - Continue actions return at most one `sectionErrors` key.
 *   - The submit action may populate multiple section keys at once.
 */
export type ServerErrorsResponse =
  | { ok: true; summary?: SubmitSummary }
  | {
      ok: false
      sectionErrors?: Partial<Record<SectionId, SectionServerErrors>>
      globalErrors?: GlobalError[]
    }
