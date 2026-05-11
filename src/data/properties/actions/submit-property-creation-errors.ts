/**
 * Typed catalogue of every error code `submitPropertyCreation` can emit.
 *
 * Codes fall in two categories:
 *
 * - **Global codes** — surface as a destructive toast on the wizard; bypass
 *   accordion focus. Already declared as the `GlobalError` discriminated
 *   union in `./server-errors.ts`; re-exported here for convenience and to
 *   keep both the catalogue + the wire type a single import away.
 *
 * - **Section-scoped codes** — land inside `sectionErrors[section][field]`
 *   (or `[rowId][field]` for row sections). These ride the same array slot
 *   as the Zod-emitted field codes (`required`, `invalidEmail`, etc.) and
 *   resolve to a localized message via `propertyCreation.checkout.<section>
 *   .validation.<code>` lookup on the client.
 *
 * Adding a new code is a deliberate change — bump this union AND add the
 * corresponding i18n entry across `messages/{en,es,pt-BR}.json`.
 *
 * Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
 *   § Server Action Contract / Error code catalogue.
 */

import type { GlobalError } from './server-errors'

// Re-export the global error union so callers have one import path for both
// catalogues. The runtime carrier is the `code` field on `GlobalError`.
export type { GlobalError } from './server-errors'

/**
 * Wizard-wide codes that surface as a toast. Every code below corresponds
 * exactly to a `GlobalError['code']` literal — the `Extract` keeps the two
 * sources in lock-step at compile time (adding a `GlobalError` variant
 * without listing it here is a type error).
 */
export type SubmitGlobalErrorCode = GlobalError['code']

/**
 * Section-scoped codes the action can emit on top of the Zod-derived field
 * codes (`required`, `invalidEmail`, ...). Each entry lists where it lands
 * in `sectionErrors`:
 *
 * - `tax_id_conflict` → `sectionErrors['tax-id'].tax_id` — raised by the
 *   RPC when another profile already owns the supplied tax id (partial
 *   unique on `profiles(tax_id) where tax_id is not null`).
 *
 * - `expense_bundle_invalid_reference` → `sectionErrors.expenses[rowId]
 *   .bundled_into_expense_index` — covers every bundle-graph violation
 *   (cycle, out-of-range, self-bundle, exclusivity). The wizard payload
 *   doesn't yet carry bundling fields, so this is defense-in-depth against
 *   the RPC raising it on a future code path.
 */
export type SubmitSectionErrorCode =
  | 'tax_id_conflict'
  | 'expense_bundle_invalid_reference'

/**
 * Tagged exception message strings the `create_property` RPC raises with
 * SQLSTATE `P0001`. The action's catch block matches against this set and
 * dispatches to the appropriate slot in the error envelope.
 *
 * `unauthenticated` is doubled — the action's own auth gate emits it as a
 * `globalErrors` entry, AND the RPC raises it defensively when the user's
 * profile row is missing. Both paths land in the same global slot.
 */
export const RPC_TAGGED_EXCEPTIONS = [
  'unauthenticated',
  'idempotency_owner_mismatch',
  'tax_id_conflict',
  'expense_bundle_invalid_reference',
] as const

export type RpcTaggedException = (typeof RPC_TAGGED_EXCEPTIONS)[number]

/** True when `message` matches one of the RPC's stable tagged exceptions. */
export function isRpcTaggedException(
  message: string,
): message is RpcTaggedException {
  return (RPC_TAGGED_EXCEPTIONS as readonly string[]).includes(message)
}
