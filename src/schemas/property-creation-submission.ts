import { z } from 'zod'

import { contractInputSchema } from './contract'
import { expenseRowSchema, expenseTypeSchema } from './expense'
import { propertyInputBaseSchema, propertyAddressInputBaseSchema } from './property'
import { rentInputSchema } from './rent'
import { taxIdBaseSchema } from './tax-id'
import { tenantInputBaseSchema } from './tenant'

// Composed persistence-boundary schema. `property` and `tax_id` are always
// required; the other sections may be skipped per the section persistence
// rules. Cross-section invariants run in the superRefine below. Country-
// specific tightening on `property` (CEP regex, state codes) is applied
// earlier via `getPropertyInputSchema` in the action.
//
// Bundling fields (`bundled_into_rent`, `bundled_into_charge_id`) exist on
// the `charge_definitions` table and the RPC accepts them, but the wizard
// UI today doesn't surface bundling — the canonical schema doesn't carry
// these fields and the composed schema doesn't validate them. Cycle / bundle
// graph integrity is enforced on the server inside the RPC; that stays the
// trust boundary. Add client-side bundling fields and their validation here
// if/when the UI ships.

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

    // `provider_request_draft_index` is a real index into another array on the
    // payload — programmer-mistake defense.
    const expenses = input.expenses ?? []
    const requestDrafts = input.provider_request_drafts ?? []
    for (let i = 0; i < expenses.length; i++) {
      const pi = expenses[i].provider_request_draft_index
      if (pi != null && (pi < 0 || pi >= requestDrafts.length)) {
        ctx.addIssue({
          code: 'custom',
          path: ['expenses', i, 'provider_request_draft_index'],
          message: 'provider_request_draft_index_out_of_range',
        })
      }
    }
  })

export type PropertyCreationSubmission = z.infer<typeof propertyCreationSubmissionSchema>
