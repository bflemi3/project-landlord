import { z } from 'zod'

import { MAX_MINOR_UNITS } from '@/data/shared/currency'

import { expenseTypeSchema } from './expense'

// Persistence-side schema mirroring `rent` table columns (see
// `supabase/migrations/20260510120500_rent_table.sql`) minus server-owned
// columns (`id`, `unit_id`, `created_by`, timestamps). The wizard's
// `rent-dates` section uses a path-specific schema with per-form ergonomics
// (`undefined` instead of `null`) and consumes the inner field validators
// below; the composed submission schema parses against `rentInputSchema`
// after the server action transforms the wizard slice.

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

// Inner field validators — re-used by the wizard's checkout-local
// `rent-dates` schema so structural rules can't drift between layers.
export const rentAmountMinorSchema = z
  .number({ error: 'required' })
  .int({ error: 'invalidAmount' })
  .positive({ error: 'invalidAmount' })
  .max(MAX_MINOR_UNITS, { error: 'tooLarge' })

export const rentDueDayOfMonthSchema = z
  .number({ error: 'required' })
  .int({ error: 'invalidDueDay' })
  .min(1, { error: 'invalidDueDay' })
  .max(31, { error: 'invalidDueDay' })

export const rentIsoDateSchema = z
  .string({ error: 'required' })
  .regex(ISO_DATE, { error: 'invalidDate' })

// Mirror of the DB `rent_adjustment_value_consistency` CHECK.
function refineAdjustmentValueConsistency(
  rent: {
    adjustment_method: RentAdjustmentMethod | null
    adjustment_amount_minor: number | null
    adjustment_basis_points: number | null
  },
  ctx: z.RefinementCtx,
) {
  const { adjustment_method, adjustment_amount_minor, adjustment_basis_points } = rent
  const requireAmount = adjustment_method === 'fixed_amount'
  const requireBasisPoints = adjustment_method === 'fixed_percentage'

  if (requireAmount && adjustment_amount_minor == null) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_amount_minor'], message: 'required' })
  }
  if (!requireAmount && adjustment_amount_minor != null) {
    ctx.addIssue({
      code: 'custom',
      path: ['adjustment_amount_minor'],
      message: 'invalidAdjustmentValue',
    })
  }
  if (requireBasisPoints && adjustment_basis_points == null) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_basis_points'], message: 'required' })
  }
  if (!requireBasisPoints && adjustment_basis_points != null) {
    ctx.addIssue({
      code: 'custom',
      path: ['adjustment_basis_points'],
      message: 'invalidAdjustmentValue',
    })
  }
}

export const rentInputSchema = z
  .object({
    amount_minor: rentAmountMinorSchema,
    currency: z.string().min(1, { error: 'required' }).max(8, { error: 'tooLong' }),
    due_day_of_month: rentDueDayOfMonthSchema,
    start_date: rentIsoDateSchema.nullable().default(null),
    end_date: rentIsoDateSchema.nullable().default(null),
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
    if (rent.start_date && rent.end_date && rent.end_date < rent.start_date) {
      ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'endDateBeforeStart' })
    }
    refineAdjustmentValueConsistency(rent, ctx)
  })

export type RentInput = z.infer<typeof rentInputSchema>
