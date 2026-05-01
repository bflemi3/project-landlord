import { z } from 'zod'

import {
  MAX_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/data/shared/currency'

export interface RentDatesInput {
  amount_minor: number | undefined
  currency: SupportedCurrency
}

export const rentDatesSchema: z.ZodType<RentDatesInput> = z.object({
  amount_minor: z
    .number({ error: 'invalidAmount' })
    .int({ error: 'invalidAmount' })
    .positive({ error: 'invalidAmount' })
    .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
    .optional(),
  currency: z
    .enum(SUPPORTED_CURRENCIES, { error: 'invalidCurrency' })
    .default('BRL'),
}).transform((data) => ({ ...defaultRentDatesInput(), ...data }))

export function defaultRentDatesInput(): RentDatesInput {
  return {
    amount_minor: undefined,
    currency: 'BRL',
  }
}

export type { SupportedCurrency }
