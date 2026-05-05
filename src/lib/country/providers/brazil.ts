import { brazilProvider as brazilAddressProvider } from '@/lib/address/providers/brazil'
import { brazilTaxIdSchema } from '@/schemas/tax-id'

import type { CountryProvider } from '../types'

export const brazilCountryProvider: CountryProvider = {
  code: 'BR',
  address: brazilAddressProvider,
  taxId: {
    schema: brazilTaxIdSchema,
  },
}
