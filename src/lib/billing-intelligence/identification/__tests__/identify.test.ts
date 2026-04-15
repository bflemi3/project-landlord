import { describe, it, expect, vi, afterEach } from 'vitest'
import { identifyProvider } from '../identify'

const enlivText = `CNPJ: 49.449.868/0001-62
Cliente:
Alex Amorim Anton
Avenida Campeche, 533`

const enlivTextNoCampeche = `CNPJ: 49.449.868/0001-62
Cliente:
Some Other Customer
Rua Qualquer, 100`

describe('identifyProvider', () => {
  afterEach(() => vi.restoreAllMocks())

  it('identifies Enliv Campeche with high confidence when Campeche is in text', () => {
    const result = identifyProvider(enlivText)
    expect(result).not.toBeNull()
    expect(result!.provider.profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
    expect(result!.confidence).toBe(0.95)
    expect(result!.cnpj).toBe('49449868000162')
  })

  it('identifies Enliv with lower confidence when Campeche is not in text', () => {
    const result = identifyProvider(enlivTextNoCampeche)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe(0.7)
  })

  it('returns null for unknown provider', () => {
    expect(identifyProvider('no CNPJ here')).toBeNull()
  })

  it('returns null for valid CNPJ not in registry', () => {
    // 33.000.167/0001-01 is a valid CNPJ (Banco do Brasil) but not in our registry
    const result = identifyProvider('CNPJ: 33.000.167/0001-01')
    expect(result).toBeNull()
  })

  it('picks highest confidence when multiple providers match same CNPJ', async () => {
    // Mock the registry to return multiple providers for the same CNPJ
    const registryModule = await import('../../providers/registry')
    vi.spyOn(registryModule, 'getProvidersByTaxId').mockImplementation((taxId) => {
      if (taxId === '49449868000162') {
        return [
          {
            profileId: 'low-conf',
            meta: { companyName: 'Enliv', companyTaxId: '49449868000162', countryCode: 'BR', displayName: 'Enliv Low', category: 'electricity', region: 'other', status: 'active', capabilities: { extraction: true, apiLookup: false, validation: false, paymentStatus: false } },
            identify: () => 0.3,
            extractBill: () => null,
          },
          {
            profileId: 'high-conf',
            meta: { companyName: 'Enliv', companyTaxId: '49449868000162', countryCode: 'BR', displayName: 'Enliv High', category: 'electricity', region: 'campeche', status: 'active', capabilities: { extraction: true, apiLookup: false, validation: false, paymentStatus: false } },
            identify: () => 0.95,
            extractBill: () => null,
          },
        ]
      }
      return registryModule.getProvidersByTaxId(taxId)
    })

    const result = identifyProvider(enlivText)
    expect(result).not.toBeNull()
    expect(result!.provider.profileId).toBe('high-conf')
    expect(result!.confidence).toBe(0.95)
  })
})
