import { z } from 'zod'

import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/data/shared/currency'
import { rentAmountMinorSchema, rentDueDayOfMonthSchema, rentIsoDateSchema } from '@/schemas/rent'

import type { CheckoutPath } from '../../../../state/registry'

// The wizard's rent-dates slice uses `undefined` (matches CurrencyInput's
// empty-state ergonomics) where the canonical `rentInputSchema` uses `null`
// (matches DB column nullability). Field-level rules (range, regex,
// integer-ness) come from canonical so they can't drift; the server action
// translates `undefined → null` and renames `due_day → due_day_of_month`
// when building the RPC payload.
export interface RentDatesInput {
  amount_minor: number | undefined
  currency: SupportedCurrency
  due_day: number | undefined
  start_date: string | undefined
  end_date: string | undefined
}

// Brazilian rentals most commonly use the 5th — a soft pre-fill, user can override.
export const DEFAULT_DUE_DAY = 5

const currencyField = z.enum(SUPPORTED_CURRENCIES, { error: 'invalidCurrency' }).default('BRL')

function refineEndAfterStart(
  data: { start_date?: string; end_date?: string },
  ctx: z.RefinementCtx,
) {
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'endDateBeforeStart' })
  }
}

// Inner shape pulled out as a named const so `RENT_DATES_FIELD_NAMES` can
// derive from it — the exported schemas have `.superRefine().transform()`
// chained and don't expose `.shape` directly.
const rentDatesContractShape = {
  amount_minor: rentAmountMinorSchema,
  currency: currencyField,
  due_day: rentDueDayOfMonthSchema,
  start_date: rentIsoDateSchema,
  end_date: rentIsoDateSchema,
}

export const rentDatesContractSchema: z.ZodType<RentDatesInput> = z
  .object(rentDatesContractShape)
  .superRefine(refineEndAfterStart)
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

export const rentDatesNoContractSchema: z.ZodType<RentDatesInput> = z
  .object({
    amount_minor: rentAmountMinorSchema.optional(),
    currency: currencyField,
    due_day: rentDueDayOfMonthSchema.optional(),
    start_date: rentIsoDateSchema.optional(),
    end_date: rentIsoDateSchema.optional(),
  })
  .superRefine(refineEndAfterStart)
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

/** Field names for the section's touched logic. Contract and no-contract
 *  schemas share keys; taken from the contract shape. */
export const RENT_DATES_FIELD_NAMES = Object.keys(
  rentDatesContractShape,
) as readonly (keyof RentDatesInput)[]

/** Defaults to the stricter contract schema when path is null — a stray
 *  validation is safer with the tighter shape than the looser one. */
export function rentDatesSchemaFor(path: CheckoutPath | null): z.ZodType<RentDatesInput> {
  return path === 'no_contract' ? rentDatesNoContractSchema : rentDatesContractSchema
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
