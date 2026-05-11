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

export const expenseAmountBehaviorSchema = z.enum(
  Constants.public.Enums.expense_amount_behavior,
  { error: 'invalidAmountBehavior' },
)

export type ExpenseAmountBehavior = z.infer<typeof expenseAmountBehaviorSchema>

export const EXPENSE_AMOUNT_BEHAVIORS = expenseAmountBehaviorSchema.options

// Provider attachment is at-most-one of four states (mirrors the DB CHECK on
// `charge_definitions`): provider_profile_id (tracked), provider_request_draft_index
// (pending, resolved by the RPC), bundled_into_rent, bundled_into_expense_index.
// All four absent = "unspecified" — valid. Row-level superRefine catches
// multiple-attachment violations; cross-array invariants (range, cycles)
// live in `findExpenseBundleCycles` below and the composed submission schema.
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

/**
 * Cycle detection over the `i → bundled_into_expense_index` directed graph.
 * Iterative DFS with white/gray/black coloring; any back edge into a GRAY node
 * marks every node currently on the stack as a cycle member.
 *
 * Returns the indices of every row participating in a cycle. The caller
 * (`propertyCreationSubmissionSchema`) handles range checks and self-bundle
 * checks separately and only feeds valid edges to the walk.
 */
export function findExpenseBundleCycles(
  rows: readonly { bundled_into_expense_index: number | null }[],
): Set<number> {
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Array<number>(rows.length).fill(WHITE)
  const inCycle = new Set<number>()

  const visit = (start: number): void => {
    const stack: { node: number; visited: boolean }[] = [
      { node: start, visited: false },
    ]
    color[start] = GRAY

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const target = rows[frame.node].bundled_into_expense_index
      const isValidEdge =
        !frame.visited &&
        target != null &&
        target >= 0 &&
        target < rows.length &&
        target !== frame.node

      if (!isValidEdge) {
        color[frame.node] = BLACK
        stack.pop()
        continue
      }

      frame.visited = true
      // `isValidEdge` already proved `target` is non-null and in-range.
      const next = target as number

      if (color[next] === GRAY) {
        for (const s of stack) inCycle.add(s.node)
        inCycle.add(next)
        color[frame.node] = BLACK
        stack.pop()
        continue
      }
      if (color[next] === BLACK) {
        color[frame.node] = BLACK
        stack.pop()
        continue
      }
      color[next] = GRAY
      stack.push({ node: next, visited: false })
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (color[i] === WHITE) visit(i)
  }

  return inCycle
}
