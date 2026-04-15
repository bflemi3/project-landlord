import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLookupCnpj = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/assert-engineer', () => ({
  assertEngineer: () => Promise.resolve('user-123'),
}))

vi.mock('@/lib/billing-intelligence/identification/cnpj-lookup', () => ({
  lookupCnpj: (...args: unknown[]) => mockLookupCnpj(...args),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  }),
}))

import { lookupCnpjAction } from '../lookup-cnpj'

describe('lookupCnpjAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when tax ID is empty', async () => {
    const result = await lookupCnpjAction('')
    expect(result.success).toBe(false)
    expect(result.status).toBe('error')
  })

  it('returns found with company info and cache ID on successful lookup', async () => {
    mockLookupCnpj.mockResolvedValue({
      cnpj: '49449868000162',
      companyName: 'ENLIV',
      legalName: 'ENLIV ENERGIA LTDA',
      activityCode: 3514000,
      activityDescription: 'Distribuição de energia elétrica',
      city: 'CURITIBA',
      state: 'PR',
      phone: '4133334444',
      email: 'contato@enliv.com.br',
      source: 'brasilapi',
      lastUpdated: '2026-04-15T00:00:00Z',
    })
    mockSingle.mockResolvedValue({ data: { id: 'cache-uuid-123' } })

    const result = await lookupCnpjAction('49.449.868/0001-62')
    expect(result.success).toBe(true)
    expect(result.status).toBe('found')
    expect(result.companyInfo?.companyName).toBe('ENLIV')
    expect(result.companyCacheId).toBe('cache-uuid-123')
    expect(mockLookupCnpj).toHaveBeenCalledWith('49449868000162')
  })

  it('returns not_found when lookup throws', async () => {
    mockLookupCnpj.mockRejectedValue(new Error('CNPJ lookup failed'))

    const result = await lookupCnpjAction('00000000000000')
    expect(result.success).toBe(true)
    expect(result.status).toBe('not_found')
    expect(result.companyInfo).toBeUndefined()
  })

  it('returns found without cache ID when cache query fails', async () => {
    mockLookupCnpj.mockResolvedValue({
      cnpj: '49449868000162',
      companyName: 'ENLIV',
      legalName: 'ENLIV ENERGIA LTDA',
      activityCode: 3514000,
      activityDescription: 'Distribuição de energia elétrica',
      city: 'CURITIBA',
      state: 'PR',
      phone: null,
      email: null,
      source: 'brasilapi',
      lastUpdated: '2026-04-15T00:00:00Z',
    })
    mockSingle.mockRejectedValue(new Error('DB error'))

    const result = await lookupCnpjAction('49449868000162')
    expect(result.success).toBe(true)
    expect(result.status).toBe('found')
    expect(result.companyInfo?.companyName).toBe('ENLIV')
    expect(result.companyCacheId).toBeUndefined()
  })
})
