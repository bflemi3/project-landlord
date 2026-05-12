import { fallbackProvider as fallbackAddressProvider } from '@/lib/address/providers/fallback'
import { fallbackTaxIdSchema } from '@/schemas/tax-id'

import type { CountryProvider } from '../types'

export const fallbackCountryProvider: CountryProvider = {
  code: '',
  address: fallbackAddressProvider,
  taxId: {
    schema: fallbackTaxIdSchema,
  },
}
