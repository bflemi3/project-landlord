import { z } from 'zod'

import { contractInputSchema } from './contract'
import { expenseRowSchema, expenseTypeSchema, findExpenseBundleCycles } from './expense'
import { propertyInputBaseSchema, propertyAddressInputBaseSchema } from './property'
import { rentInputSchema } from './rent'
import { taxIdBaseSchema } from './tax-id'
import { tenantInputBaseSchema } from './tenant'

// Composed persistence-boundary schema. `property` and `tax_id` are always
// required; the other sections may be skipped per the section persistence
// rules. Cross-section invariants run in the superRefine below. Country-
// specific tightening on `property` (CEP regex, state codes) is applied
// earlier via `getPropertyInputSchema` in the action.

const propertySubmissionSchema = propertyInputBaseSchema.extend(
  propertyAddressInputBaseSchema.shape,
)

const tenantSubmissionRowSchema = tenantInputBaseSchema.extend({
  taxId: taxIdBaseSchema,
})

const taxIdSubmissionSchema = z.object({ tax_id: taxIdBaseSchema })

const providerRequestDraftSchema = z.object({
  requested_provider_name: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .max(200, { error: 'tooLong' }),
  requested_provider_tax_id: z
    .string()
    .trim()
    .max(64, { error: 'tooLong' })
    .nullable()
    .default(null),
  expense_type: expenseTypeSchema.nullable().default(null),
  bill_file: z
    .object({
      mime_type: z.string().min(1, { error: 'required' }),
      original_filename: z.string().min(1, { error: 'required' }),
      extension: z.string().min(1, { error: 'required' }),
      bytes: z.number().int({ error: 'invalidBytes' }).positive({ error: 'invalidBytes' }),
    })
    .nullable()
    .default(null),
})

export const propertyCreationSubmissionSchema = z
  .object({
    path: z.enum(['contract', 'no_contract'], { error: 'invalidPath' }),
    property: propertySubmissionSchema,
    rent: rentInputSchema.optional(),
    tenants: z.array(tenantSubmissionRowSchema).optional(),
    expenses: z.array(expenseRowSchema).optional(),
    provider_request_drafts: z.array(providerRequestDraftSchema).optional(),
    tax_id: taxIdSubmissionSchema,
    contract: contractInputSchema.optional(),
  })
  .superRefine((input, ctx) => {
    // Contract path requires both contract + rent; no_contract forbids contract.
    if (input.path === 'contract') {
      if (input.contract == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['contract'],
          message: 'contractRequiredOnContractPath',
        })
      }
      if (input.rent == null) {
        ctx.addIssue({ code: 'custom', path: ['rent'], message: 'rentRequiredOnContractPath' })
      }
    } else if (input.path === 'no_contract' && input.contract != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['contract'],
        message: 'contractForbiddenOnNoContractPath',
      })
    }

    const expenses = input.expenses ?? []
    if (expenses.length === 0) return

    // Range checks: bundled_into_expense_index must be in `[0, expenses.length)`
    // and not point at self; provider_request_draft_index must point at a real
    // draft in `provider_request_drafts`.
    const requestDrafts = input.provider_request_drafts ?? []
    for (let i = 0; i < expenses.length; i++) {
      const row = expenses[i]
      const bi = row.bundled_into_expense_index
      if (bi != null && (bi < 0 || bi >= expenses.length || bi === i)) {
        ctx.addIssue({
          code: 'custom',
          path: ['expenses', i, 'bundled_into_expense_index'],
          message: 'expense_bundle_invalid_reference',
        })
      }
      const pi = row.provider_request_draft_index
      if (pi != null && (pi < 0 || pi >= requestDrafts.length)) {
        ctx.addIssue({
          code: 'custom',
          path: ['expenses', i, 'provider_request_draft_index'],
          message: 'expense_bundle_invalid_reference',
        })
      }
    }

    // Cycle check on the `i → bundled_into_expense_index` directed graph.
    for (const node of findExpenseBundleCycles(expenses)) {
      ctx.addIssue({
        code: 'custom',
        path: ['expenses', node, 'bundled_into_expense_index'],
        message: 'expense_bundle_invalid_reference',
      })
    }
  })

export type PropertyCreationSubmission = z.infer<typeof propertyCreationSubmissionSchema>
