import { z } from 'zod'

import { contractInputSchema } from './contract'
import { expenseRowSchema } from './expense'
import { propertyInputBaseSchema, propertyAddressInputBaseSchema } from './property'
import { rentInputSchema } from './rent'
import { taxIdBaseSchema } from './tax-id'
import { tenantInputBaseSchema } from './tenant'

// =============================================================================
// Property creation submission — composed Zod schema.
//
// The persistence boundary's single validation pass. Wizard sections each
// own a checkout-local schema (`steps/checkout/sections/<section>/schemas.ts`)
// for in-form validation; this composed schema re-validates the merged
// payload server-side (the trust boundary) AND enforces cross-section
// invariants the per-form schemas can't see:
//
// 1. `path === 'contract'` ⟹ contract required, rent required.
// 2. `path === 'no_contract'` ⟹ contract forbidden, rent optional.
// 3. Bundle-graph integrity for `expenses`:
//      - `bundled_into_expense_index` must be in range `[0, expenses.length)`
//      - `bundled_into_expense_index !== i` (no self-bundle)
//      - The directed graph `i → bundled_into_expense_index` is acyclic.
// 4. Expenses bundle exclusivity:
//      - `bundled_into_rent === true` ⟹ no `bundled_into_expense_index`, no
//        provider attachment, no `provider_request_draft_index`.
//      - `bundled_into_expense_index !== null` ⟹ no `bundled_into_rent`, no
//        provider attachment, no `provider_request_draft_index`.
//
// Schema-version match (extraction.schemaVersion === CONTRACT_EXTRACTION_SCHEMA_VERSION)
// is enforced inside `contractInputSchema`; rejection there surfaces via the
// composed schema's `contract.extraction.extraction_schema_version` issue.
//
// Per-section keys are all optional. The contract/no-contract invariants
// (1, 2) are enforced at the cross-section refinement, so a `no_contract`
// path payload with no `rent` / no `contract` parses cleanly.
// =============================================================================

const propertySubmissionSchema = propertyInputBaseSchema.extend(
  // `propertyInputBaseSchema` carries name + country_code + property_type;
  // address fields live on `propertyAddressInputBaseSchema` (country-agnostic
  // base shape). Country-specific tightening (CEP regex, state codes) is
  // applied by the server action's per-section parse via `getPropertyInputSchema`.
  propertyAddressInputBaseSchema.shape,
)

const tenantSubmissionRowSchema = tenantInputBaseSchema.extend({
  taxId: taxIdBaseSchema,
})

const taxIdSubmissionSchema = z.object({
  tax_id: taxIdBaseSchema,
})

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
  expense_type: z
    .string()
    .nullable()
    .default(null),
  bill_file: z
    .object({
      mime_type: z.string().min(1, { error: 'required' }),
      original_filename: z.string().min(1, { error: 'required' }),
      extension: z.string().min(1, { error: 'required' }),
      bytes: z
        .number()
        .int({ error: 'invalidBytes' })
        .positive({ error: 'invalidBytes' }),
    })
    .nullable()
    .default(null),
})

export const propertyCreationSubmissionSchema = z
  .object({
    path: z.enum(['contract', 'no_contract'], { error: 'invalidPath' }),
    property: propertySubmissionSchema.optional(),
    rent: rentInputSchema.optional(),
    tenants: z.array(tenantSubmissionRowSchema).optional(),
    expenses: z.array(expenseRowSchema).optional(),
    provider_request_drafts: z.array(providerRequestDraftSchema).optional(),
    tax_id: taxIdSubmissionSchema.optional(),
    contract: contractInputSchema.optional(),
  })
  .superRefine((input, ctx) => {
    // --- Contract/no-contract path invariants -------------------------------
    if (input.path === 'contract') {
      if (input.contract == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['contract'],
          message: 'contractRequiredOnContractPath',
        })
      }
      if (input.rent == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['rent'],
          message: 'rentRequiredOnContractPath',
        })
      }
    } else if (input.path === 'no_contract') {
      if (input.contract != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['contract'],
          message: 'contractForbiddenOnNoContractPath',
        })
      }
    }

    // --- Expenses bundle-graph integrity ------------------------------------
    const expenses = input.expenses ?? []
    if (expenses.length === 0) return

    const requestDrafts = input.provider_request_drafts ?? []

    // First pass: cross-array index validity. Range, no-self-bundle, and
    // provider_request_draft_index pointing at a real draft.
    for (let i = 0; i < expenses.length; i++) {
      const row = expenses[i]
      const bi = row.bundled_into_expense_index
      if (bi != null) {
        if (bi < 0 || bi >= expenses.length || bi === i) {
          ctx.addIssue({
            code: 'custom',
            path: ['expenses', i, 'bundled_into_expense_index'],
            message: 'expense_bundle_invalid_reference',
          })
        }
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

    // Second pass: cycle detection on the `i → bundled_into_expense_index`
    // directed graph. DFS with white/gray/black coloring. Any gray-on-gray
    // edge is a back edge → cycle. The row-level superRefine has already
    // rejected exclusivity violations; we only walk valid index edges here.
    const WHITE = 0
    const GRAY = 1
    const BLACK = 2
    const color = new Array<number>(expenses.length).fill(WHITE)
    const inCycle = new Set<number>()

    const visit = (start: number): void => {
      const stack: { node: number; iter: number }[] = [{ node: start, iter: 0 }]
      color[start] = GRAY
      while (stack.length > 0) {
        const frame = stack[stack.length - 1]
        const row = expenses[frame.node]
        const target = row.bundled_into_expense_index
        const targetValid =
          target != null &&
          target >= 0 &&
          target < expenses.length &&
          target !== frame.node
        if (!targetValid || frame.iter > 0) {
          color[frame.node] = BLACK
          stack.pop()
          continue
        }
        if (target == null) {
          color[frame.node] = BLACK
          stack.pop()
          continue
        }
        frame.iter++
        if (color[target] === GRAY) {
          // Back edge — every node currently GRAY is on the cycle.
          for (const s of stack) inCycle.add(s.node)
          inCycle.add(target)
          color[frame.node] = BLACK
          stack.pop()
          continue
        }
        if (color[target] === BLACK) {
          color[frame.node] = BLACK
          stack.pop()
          continue
        }
        color[target] = GRAY
        stack.push({ node: target, iter: 0 })
      }
    }

    for (let i = 0; i < expenses.length; i++) {
      if (color[i] === WHITE) visit(i)
    }

    for (const node of inCycle) {
      ctx.addIssue({
        code: 'custom',
        path: ['expenses', node, 'bundled_into_expense_index'],
        message: 'expense_bundle_invalid_reference',
      })
    }
  })

export type PropertyCreationSubmission = z.infer<
  typeof propertyCreationSubmissionSchema
>
