import type { Provider } from './types'
import { enlivCampeche } from './enliv-campeche'

/**
 * All registered provider code modules.
 * To add a new provider: create the module, import it, add to this array.
 */
const providers: Provider[] = [
  enlivCampeche,
]

/** Find a provider by its profile UUID (provider_invoice_profiles.id) */
export function getProviderByProfileId(profileId: string): Provider | undefined {
  return providers.find((p) => p.profileId === profileId)
}

/** Find providers by company tax ID. Returns all matching (multiple if different regions). */
export function getProvidersByTaxId(taxId: string): Provider[] {
  const clean = taxId.replace(/[.\-/]/g, '')
  return providers.filter((p) => p.meta.companyTaxId === clean)
}

/** List all registered providers. */
export function getAllProviders(): Provider[] {
  return [...providers]
}
