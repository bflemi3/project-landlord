import { z } from 'zod'

import {
  MAX_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/data/shared/currency'

import type { CheckoutPath } from './registry'

export interface RentDatesInput {
  amount_minor: number | undefined
  currency: SupportedCurrency
  due_day: number | undefined
}

// Default rent due day. Brazilian rentals most commonly use the 5th of the
// month — a soft pre-fill the user can override.
export const DEFAULT_DUE_DAY = 5

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

const currencyField = z
  .enum(SUPPORTED_CURRENCIES, { error: 'invalidCurrency' })
  .default('BRL')

// Path-specific schemas. The contract path makes amount_minor + due_day
// required (the form gates Continue on schema validity, so the user must
// fill them before advancing). The no-contract path keeps both optional so
// a partial / empty section still parses.
export const rentDatesContractSchema: z.ZodType<RentDatesInput> = z
  .object({
    amount_minor: amountMinorInner,
    currency: currencyField,
    due_day: dueDayInner,
  })
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

export const rentDatesNoContractSchema: z.ZodType<RentDatesInput> = z
  .object({
    amount_minor: amountMinorInner.optional(),
    currency: currencyField,
    due_day: dueDayInner.optional(),
  })
  .transform((data) => ({ ...defaultRentDatesInput(), ...data }))

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
  }
}

export type { SupportedCurrency }
