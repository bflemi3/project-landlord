/**
 * One home for the wizard's cross-cutting types. Re-exports the canonical
 * declarations so callers inside `state/` (and section components) have a
 * single import path.
 *
 * - Wire types (`ServerErrorsResponse`, `FlatFieldErrors`, ...) live with
 *   the property-creation server action since they're shared with future
 *   server actions.
 * - Section identifiers and path live with the registry that defines them.
 * - Per-section state types (`PropertyServerErrors`, `ExpensesTouched`,
 *   ...) stay in each section's `state.ts` — they're section-local.
 */

export type { SectionId, CheckoutPath } from './registry'
export type { SectionStatus } from './persistence'
export type { SectionData } from './extraction-seeding'
export type { SectionValidity } from './section-validity'

export type {
  FlatFieldErrors,
  SectionServerErrors,
  GlobalError,
  SubmitSummary,
  ServerErrorsResponse,
} from '@/data/properties/actions/server-errors'
