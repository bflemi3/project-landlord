import { z } from 'zod'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'
import { Constants } from '@/lib/types/database'

// =============================================================================
// Expense — canonical, database-derived Zod schemas.
//
// `expense_type` and `expense_amount_behavior` are Postgres enums in
// `supabase/migrations/...` and the regenerated `src/lib/types/database.ts`
// surfaces them via `Constants.public.Enums.*`. Mirroring them here as hand-
// coded literal arrays would let the DB and the schema drift; everything
// downstream (wizard checkout-local schemas, LLM extraction schema, data-
// access types) imports from this file.
//
// The wizard's checkout-local `steps/checkout/sections/expenses/schemas.ts`
// extends `expenseRowSchema` with UI-only fields (`id`, `isExtracted`); the
// persistence-side `propertyCreationSubmissionSchema` consumes the canonical
// row shape after the server action strips the UI-only keys.
// =============================================================================

export const expenseTypeSchema = z.enum(Constants.public.Enums.expense_type, {
  error: 'invalidExpenseType',
})

export type ExpenseType = z.infer<typeof expenseTypeSchema>

/** Sorted as ordered in the Postgres enum; safe to iterate for UI taxonomies
 *  that need a `readonly ExpenseType[]`. Re-exported from the wizard's
 *  expenses section as `EXPENSE_TYPES` for backwards compatibility. */
export const EXPENSE_TYPES = expenseTypeSchema.options

export const expenseAmountBehaviorSchema = z.enum(
  Constants.public.Enums.expense_amount_behavior,
  { error: 'invalidAmountBehavior' },
)

export type ExpenseAmountBehavior = z.infer<typeof expenseAmountBehaviorSchema>

export const EXPENSE_AMOUNT_BEHAVIORS = expenseAmountBehaviorSchema.options

// =============================================================================
// Expense row — persistence shape (one row per `charge_definitions` insert).
//
// Money: `amount_minor` (integer minor units) + `currency` (ISO 4217). No
// floats. Per `data-modeling`. The amount is optional because the wizard
// allows the user to enter a placeholder row whose amount lands later (e.g.
// expense_type chosen, amount unknown — `amount_behavior = 'unknown'`).
//
// Provider attachment is at-most-one of four states (mirrors the DB CHECK on
// `charge_definitions`):
//   1. provider_profile_id          — tracked, known provider
//   2. provider_request_draft_index — pending, references a draft in
//                                     p_provider_request_drafts (resolved
//                                     to provider_request_id in the RPC)
//   3. bundled_into_rent: true      — rolled into rent total
//   4. bundled_into_expense_index   — rolled into another expense (parent
//                                     row in this submission)
// All four absent is valid → "unspecified" state.
//
// Cross-row invariants (bundle-graph integrity, exclusivity) live in
// `property-creation-submission.ts` because they reach across the array. The
// row-level schema validates structure only.
// =============================================================================

export const expenseRowSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'tooLong' }),
    expense_type: expenseTypeSchema,
    amount_behavior: expenseAmountBehaviorSchema,
    amount_minor: z
      .number({ error: 'required' })
      .int({ error: 'invalidAmount' })
      .positive({ error: 'invalidAmount' })
      .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
      .nullable(),
    currency: z.string().min(1, { error: 'required' }).max(8, { error: 'tooLong' }),
    provider_profile_id: z.string().uuid().nullable().default(null),
    provider_request_draft_index: z
      .number()
      .int({ error: 'invalidIndex' })
      .min(0, { error: 'invalidIndex' })
      .nullable()
      .default(null),
    bundled_into_rent: z.boolean().default(false),
    bundled_into_expense_index: z
      .number()
      .int({ error: 'invalidIndex' })
      .min(0, { error: 'invalidIndex' })
      .nullable()
      .default(null),
  })
  .superRefine((row, ctx) => {
    // Row-level exclusivity check. Cross-array index validity (in-range,
    // no cycles, no self-bundle) is enforced in `propertyCreationSubmissionSchema`
    // because it requires the full array context.
    const attachments = [
      row.provider_profile_id !== null,
      row.provider_request_draft_index !== null,
      row.bundled_into_rent,
      row.bundled_into_expense_index !== null,
    ].filter(Boolean).length

    if (attachments > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'expense_bundle_invalid_reference',
        path: ['bundled_into_rent'],
      })
    }
  })

export type ExpenseRow = z.infer<typeof expenseRowSchema>
