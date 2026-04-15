import { describe, it, expect } from 'vitest'
import { getProviderByProfileId, getProvidersByTaxId, getAllProviders } from '../registry'

describe('provider registry', () => {
  it('finds provider by profile ID', () => {
    const provider = getProviderByProfileId('a1b2c3d4-0002-0002-0002-000000000001')
    expect(provider).toBeDefined()
    expect(provider?.meta.companyTaxId).toBe('49449868000162')
  })

  it('finds providers by CNPJ', () => {
    const providers = getProvidersByTaxId('49449868000162')
    expect(providers.length).toBeGreaterThanOrEqual(1)
    expect(providers[0].profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
  })

  it('returns empty for unknown CNPJ', () => {
    expect(getProvidersByTaxId('00000000000000')).toEqual([])
  })

  it('returns undefined for unknown profile ID', () => {
    expect(getProviderByProfileId('nonexistent')).toBeUndefined()
  })

  it('lists all providers', () => {
    expect(getAllProviders().length).toBeGreaterThanOrEqual(1)
  })
})
