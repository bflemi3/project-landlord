import { z } from 'zod'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'

import { expenseTypeSchema } from './expense'

// =============================================================================
// Rent — canonical persistence-side schema.
//
// Mirrors the `rent` table shape (see
// `supabase/migrations/20260510120500_rent_table.sql`) minus the server-
// owned columns (`id`, `unit_id`, `created_by`, `created_at`, `updated_at`,
// `deleted_at`) which the RPC populates. This schema is composed into
// `propertyCreationSubmissionSchema` as `p_rent`.
//
// The wizard's checkout-local `rent-dates` section uses a wider schema with
// per-path optionality (contract path → required fields, no_contract path →
// all optional). This canonical schema represents the persistence payload
// after the wizard has settled all values — the composed submission schema
// makes the whole `rent` key optional, so an absent rent payload (no_contract
// path) is allowed at the submission layer.
//
// Money: `amount_minor` (integer minor units) + `currency` (ISO 4217). No
// floats. The split `adjustment_amount_minor` / `adjustment_basis_points`
// columns let one column carry a flat money delta (fixed_amount) and the
// other carry a percentage in basis points (fixed_percentage). The DB CHECK
// constraint defends; this Zod refinement enforces the same invariant
// earlier in the pipeline so the wizard sees a clean error code before the
// round-trip.
// =============================================================================

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const rentAdjustmentFrequencySchema = z.enum(
  ['monthly', 'quarterly', 'biannual', 'annual', 'other'],
  { error: 'invalidAdjustmentFrequency' },
)
export type RentAdjustmentFrequency = z.infer<typeof rentAdjustmentFrequencySchema>

export const rentAdjustmentMethodSchema = z.enum(
  ['index', 'fixed_amount', 'fixed_percentage', 'other'],
  { error: 'invalidAdjustmentMethod' },
)
export type RentAdjustmentMethod = z.infer<typeof rentAdjustmentMethodSchema>

export const rentInputSchema = z
  .object({
    amount_minor: z
      .number({ error: 'required' })
      .int({ error: 'invalidAmount' })
      .positive({ error: 'invalidAmount' })
      .max(MAX_MINOR_UNITS, { error: 'tooLarge' }),
    currency: z.string().min(1, { error: 'required' }).max(8, { error: 'tooLong' }),
    due_day_of_month: z
      .number({ error: 'required' })
      .int({ error: 'invalidDueDay' })
      .min(1, { error: 'invalidDueDay' })
      .max(31, { error: 'invalidDueDay' }),
    start_date: z
      .string()
      .regex(ISO_DATE, { error: 'invalidDate' })
      .nullable()
      .default(null),
    end_date: z
      .string()
      .regex(ISO_DATE, { error: 'invalidDate' })
      .nullable()
      .default(null),
    adjustment_frequency: rentAdjustmentFrequencySchema.nullable().default(null),
    adjustment_method: rentAdjustmentMethodSchema.nullable().default(null),
    adjustment_index: z.string().max(64, { error: 'tooLong' }).nullable().default(null),
    adjustment_amount_minor: z
      .number()
      .int({ error: 'invalidAmount' })
      .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
      .nullable()
      .default(null),
    adjustment_basis_points: z
      .number()
      .int({ error: 'invalidBasisPoints' })
      .min(0, { error: 'invalidBasisPoints' })
      .max(1_000_000, { error: 'invalidBasisPoints' })
      .nullable()
      .default(null),
    includes: z.array(expenseTypeSchema).nullable().default(null),
  })
  .superRefine((rent, ctx) => {
    if (
      rent.start_date &&
      rent.end_date &&
      rent.end_date < rent.start_date
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'endDateBeforeStart',
      })
    }

    // Mirror of the DB `rent_adjustment_value_consistency` CHECK. Exactly one
    // of the split adjustment value columns is non-null when the method is
    // numeric; for `index` / `other` / null both must be null.
    switch (rent.adjustment_method) {
      case 'fixed_amount':
        if (rent.adjustment_amount_minor == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_amount_minor'],
            message: 'required',
          })
        }
        if (rent.adjustment_basis_points != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_basis_points'],
            message: 'invalidAdjustmentValue',
          })
        }
        break
      case 'fixed_percentage':
        if (rent.adjustment_basis_points == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_basis_points'],
            message: 'required',
          })
        }
        if (rent.adjustment_amount_minor != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_amount_minor'],
            message: 'invalidAdjustmentValue',
          })
        }
        break
      case 'index':
      case 'other':
      case null:
        if (rent.adjustment_amount_minor != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_amount_minor'],
            message: 'invalidAdjustmentValue',
          })
        }
        if (rent.adjustment_basis_points != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['adjustment_basis_points'],
            message: 'invalidAdjustmentValue',
          })
        }
        break
    }
  })

export type RentInput = z.infer<typeof rentInputSchema>
