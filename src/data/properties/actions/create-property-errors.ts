/**
 * Typed catalogue of every error code `createProperty` can emit. Section-
 * scoped codes resolve via `propertyCreation.checkout.<section>.validation
 * .<code>`; global codes via `propertyCreation.errors.<code>`. Adding a code
 * requires both a union update here and an i18n entry across all locales.
 */

import type { GlobalError } from './server-errors'

export type { GlobalError } from './server-errors'

/** Lock-step with `GlobalError['code']` — adding a variant without listing
 *  it here is a type error. */
export type SubmitGlobalErrorCode = GlobalError['code']

export type SubmitSectionErrorCode = 'tax_id_conflict' | 'expense_bundle_invalid_reference'

/** Tagged exception messages the `create_property` RPC raises (SQLSTATE
 *  `P0001`). The action's catch block dispatches off this set. */
export const RPC_TAGGED_EXCEPTIONS = [
  'unauthenticated',
  'idempotency_owner_mismatch',
  'tax_id_conflict',
  'expense_bundle_invalid_reference',
] as const

export type RpcTaggedException = (typeof RPC_TAGGED_EXCEPTIONS)[number]

export function isRpcTaggedException(message: string): message is RpcTaggedException {
  return (RPC_TAGGED_EXCEPTIONS as readonly string[]).includes(message)
}
