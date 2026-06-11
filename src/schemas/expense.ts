import { z } from 'zod'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'
import { Constants } from '@/lib/types/database'

// `Constants.public.Enums.*` is regenerated from the Postgres enums — derive
// from it so the schema can't drift from the DB.

export const expenseTypeSchema = z.enum(Constants.public.Enums.expense_type, {
  error: 'invalidExpenseType',
})

export type ExpenseType = z.infer<typeof expenseTypeSchema>

export const EXPENSE_TYPES = expenseTypeSchema.options

export const expenseAmountBehaviorSchema = z.enum(Constants.public.Enums.expense_amount_behavior, {
  error: 'invalidAmountBehavior',
})

export type ExpenseAmountBehavior = z.infer<typeof expenseAmountBehaviorSchema>

export const EXPENSE_AMOUNT_BEHAVIORS = expenseAmountBehaviorSchema.options

// Bundling fields exist on the `charge_definitions` table (`bundled_into_rent`,
// `bundled_into_charge_id`) and the RPC accepts them, but the wizard UI today
// doesn't surface bundling — the canonical schema doesn't carry these fields.
// The RPC inserts defaults when the wizard payload omits them. Add bundling
// fields and their validation here if/when the UI ships.
//
// Provider attachment is at-most-one of {provider_profile_id,
// provider_request_draft_index}. Both absent = "unspecified" — valid.
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
  })
  .superRefine((row, ctx) => {
    if (row.provider_profile_id !== null && row.provider_request_draft_index !== null) {
      // Row-level — the conflict is between two fields. Pinning the error to
      // one would mis-flag a value the user may not have touched.
      ctx.addIssue({
        code: 'custom',
        message: 'provider_attachment_conflict',
        path: [],
      })
    }
  })

export type ExpenseRow = z.infer<typeof expenseRowSchema>
