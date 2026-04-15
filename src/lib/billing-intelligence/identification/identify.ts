import { extractCnpjsFromText } from './cnpj-extract'
import { getProvidersByTaxId } from '../providers/registry'
import type { Provider } from '../providers/types'

export interface IdentificationResult {
  provider: Provider
  cnpj: string
  confidence: number
}

/**
 * Identify which provider issued a bill from its text content.
 * Extracts CNPJs -> looks up in registry -> picks highest confidence.
 */
export function identifyProvider(text: string): IdentificationResult | null {
  const cnpjs = extractCnpjsFromText(text)

  for (const cnpj of cnpjs) {
    const providers = getProvidersByTaxId(cnpj)
    if (providers.length === 0) continue

    if (providers.length === 1) {
      const confidence = providers[0].identify(text) ?? 0.5
      return { provider: providers[0], cnpj, confidence }
    }

    let best: { provider: Provider; confidence: number } | null = null
    for (const provider of providers) {
      const confidence = provider.identify(text)
      if (confidence !== null && (best === null || confidence > best.confidence)) {
        best = { provider, confidence }
      }
    }

    if (best) return { provider: best.provider, cnpj, confidence: best.confidence }
  }

  return null
}
