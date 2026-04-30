import { getAddressProvider } from '@/lib/address/provider'
import { propertyBaseSchema } from './schema'

export function getPropertyInputSchema(countryCode = 'BR') {
  const addressProvider = getAddressProvider(countryCode)
  return propertyBaseSchema.extend(addressProvider.addressSchema.shape)
}
