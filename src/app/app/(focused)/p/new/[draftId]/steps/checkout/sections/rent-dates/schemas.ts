import { z } from 'zod'

import {
  MAX_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/data/shared/currency'

import type { CheckoutPath } from '../../../../state/registry'

export interface RentDatesInput {
  amount_minor: number | undefined
  currency: SupportedCurrency
  due_day: number | undefined
  start_date: string | undefined
  end_date: string | undefined
}

// Default rent due day. Brazilian rentals most commonly use the 5th of the
// month — a soft pre-fill the user can override.
export const DEFAULT_DUE_DAY = 5

// ISO calendar-date format the slice stores: YYYY-MM-DD. Anything else is
// rejected with `invalidDate` so the picker (which always emits ISO) is the
// only sanctioned input path.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Inner field validators — pure structural rules (type, range, integer-ness).
// Composed into a path-specific schema below by adding `.optional()` for the
// fields that may be left blank on the no-contract path. The type-error
// message is `'required'` so a missing field surfaces with the same code
// regardless of why it failed (undefined input, type mismatch).
const amountMinorInner = z
  .number({ error: 'required' })
  .int({ error: 'invalidAmount' })
  .positive({ error: 'invalidAmount' })
  .max(MAX_MINOR_UNITS, { error: 'tooLarge' })

const dueDayInner = z
  .number({ error: 'required' })
  .int({ error: 'invalidDueDay' })
  .min(1, { error: 'invalidDueDay' })
  .max(31, { error: 'invalidDueDay' })

const startDateInner = z
  .string({ error: 'required' })
  .regex(ISO_DATE, { error: 'invalidDate' })

const endDateInner = z
  .string({ error: 'required' })
  .regex(ISO_DATE, { error: 'invalidDate' })

const currencyField = z
  .enum(SUPPORTED_CURRENCIES, { error: 'invalidCurrency' })
  .default('BRL')

// Cross-field: when both dates are present, end must be ≥ start. Lexicographic
// comparison is sound because the format is fixed-width ISO YYYY-MM-DD. The
// refine sits BEFORE `.transform` below so it sees raw input (no defaults
// folded in) and the issue path matches the original field name.
function refineEndAfterStart(
  data: { start_date?: string; end_date?: string },
  ctx: z.RefinementCtx,
) {
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({
      code: 'custom',
      path: ['end_date'],
      message: 'endDateBeforeStart',
    })
  }
}

// Path-specific schemas. The contract path makes amount_minor + due_day +
// start_date + end_date required (the form gates Continue on schema validity,
// so the user must fill them before advancing). The no-contract path keeps
// every field optional so a partial / empty section still parses.
//
// The inner shapes are pulled out as named consts so RENT_DATES_FIELD_NAMES
// can derive from them — single source of truth for the field list, since
// the exported schemas have `.superRefine().transform()` chained and don't
// expose `.shape` directly.
const rentDatesContractShape = {
  amount_minor: amountMinorInner,
  currency: currencyField,
  due_day: dueDayInner,
  start_date: startDateInner,
  end_date: endDateInner,
}

export const rentDatesContractSchema: z.ZodType<RentDatesInput> = z
  .object(rentDatesContractShape)
  .superRefine(refineEndAfterStart)
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

export const rentDatesNoContractSchema: z.ZodType<RentDatesInput> = z
  .object({
    amount_minor: amountMinorInner.optional(),
    currency: currencyField,
    due_day: dueDayInner.optional(),
    start_date: startDateInner.optional(),
    end_date: endDateInner.optional(),
  })
  .superRefine(refineEndAfterStart)
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

/** Field names derived from the schema's shape — single source of truth
 *  for the rent-dates section's touched logic. The contract and no-contract
 *  schemas have the same keys; this is taken from the contract shape. */
export const RENT_DATES_FIELD_NAMES = Object.keys(
  rentDatesContractShape,
) as readonly (keyof RentDatesInput)[]

/**
 * Picks the right schema for the current wizard path. Defaults to the
 * contract schema when path is null — the section shouldn't render before
 * Step 1 commits the path, but defaulting to the stricter shape makes a
 * stray validation safer than the looser one.
 */
export function rentDatesSchemaFor(
  path: CheckoutPath | null,
): z.ZodType<RentDatesInput> {
  return path === 'no_contract'
    ? rentDatesNoContractSchema
    : rentDatesContractSchema
}

export function defaultRentDatesInput(): RentDatesInput {
  return {
    amount_minor: undefined,
    currency: 'BRL',
    due_day: DEFAULT_DUE_DAY,
    start_date: undefined,
    end_date: undefined,
  }
}

export type { SupportedCurrency }
