import { describe, it, expect, vi, beforeEach } from 'vitest'

// Configurable mock state — tests set these before calling lookupCnpj
// singleResults is a queue: each .single() call shifts the next result
let singleResults: Array<{ data: Record<string, unknown> | null }> = []
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockHistoryInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'company_cache_history') {
        return { insert: mockHistoryInsert }
      }
      // company_cache table
      return {
        select: () => ({
          eq: () => ({
            single: () => {
              const next = singleResults.shift()
              return Promise.resolve(next ?? { data: null })
            },
          }),
        }),
        insert: mockInsert,
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }
    },
  }),
}))

// Must import after vi.mock
import { lookupCnpj, verifyCnpjExists } from '../cnpj-lookup'

describe('lookupCnpj', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    singleResults = []
    mockInsert.mockClear()
    mockHistoryInsert.mockClear()
  })

  it('returns data from BrasilAPI when cache is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        cnpj: '49449868000162',
        razao_social: 'ENLIV ENERGIA LTDA',
        nome_fantasia: 'ENLIV',
        cnae_fiscal: 3514000,
        cnae_fiscal_descricao: 'Distribuição de energia elétrica',
        municipio: 'CURITIBA',
        uf: 'PR',
        ddd_telefone_1: '4133334444',
        email: 'contato@enliv.com.br',
      }), { status: 200 }),
    )

    const result = await lookupCnpj('49449868000162')
    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('brasilapi')
    expect(result.phone).toBe('4133334444')
    expect(result.email).toBe('contato@enliv.com.br')
  })

  it('falls back to ReceitaWS when BrasilAPI fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        cnpj: '49449868000162',
        nome: 'ENLIV ENERGIA LTDA',
        fantasia: 'ENLIV',
        atividade_principal: [{ code: '35.14-0-00', text: 'Distribuição de energia elétrica' }],
        municipio: 'CURITIBA',
        uf: 'PR',
        telefone: '(41) 3333-4444',
        email: 'contato@enliv.com.br',
      }), { status: 200 }))

    const result = await lookupCnpj('49449868000162')
    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('receitaws')
    expect(result.phone).toBe('(41) 3333-4444')
    expect(result.email).toBe('contato@enliv.com.br')
  })

  it('throws when all sources fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))

    await expect(lookupCnpj('00000000000000')).rejects.toThrow('CNPJ lookup failed')
  })

  it('returns cached data when cache is fresh', async () => {
    singleResults = [{ data: {
      tax_id: '49449868000162',
      legal_name: 'ENLIV ENERGIA LTDA',
      trade_name: 'ENLIV',
      activity_code: 3514000,
      activity_description: 'Distribuição de energia elétrica',
      city: 'CURITIBA',
      state: 'PR',
      phone: '4133334444',
      email: 'contato@enliv.com.br',
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } }]

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await lookupCnpj('49449868000162')

    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('cache')
    expect(result.legalName).toBe('ENLIV ENERGIA LTDA')
    expect(result.city).toBe('CURITIBA')
    expect(result.phone).toBe('4133334444')
    expect(result.email).toBe('contato@enliv.com.br')
    expect(fetchSpy).not.toHaveBeenCalled() // no API calls when cache hits
  })

  it('skips stale cache and fetches from API', async () => {
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 45) // 45 days old, exceeds 30-day max

    singleResults = [
      { data: {
        tax_id: '49449868000162',
        legal_name: 'OLD NAME',
        trade_name: 'OLD',
        activity_code: 0,
        activity_description: 'old',
        city: 'OLD',
        state: 'XX',
        fetched_at: staleDate.toISOString(),
        updated_at: staleDate.toISOString(),
      } },
      { data: null }, // saveToCache existing check — no existing record
    ]

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        cnpj: '49449868000162',
        razao_social: 'ENLIV ENERGIA LTDA',
        nome_fantasia: 'ENLIV',
        cnae_fiscal: 3514000,
        cnae_fiscal_descricao: 'Distribuição de energia elétrica',
        municipio: 'CURITIBA',
        uf: 'PR',
      }), { status: 200 }),
    )

    const result = await lookupCnpj('49449868000162')
    expect(result.source).toBe('brasilapi')
    expect(result.companyName).toBe('ENLIV')
  })

  it('updates existing cache record and tracks field changes', async () => {
    singleResults = [
      { data: null }, // cache miss
      { data: {       // saveToCache finds existing record with different values
        id: 'existing-id-123',
        legal_name: 'OLD LEGAL NAME',
        trade_name: 'OLD TRADE',
        activity_description: 'old activity',
        city: 'OLD CITY',
        state: 'XX',
      } },
    ]

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        cnpj: '49449868000162',
        razao_social: 'ENLIV ENERGIA LTDA',
        nome_fantasia: 'ENLIV',
        cnae_fiscal: 3514000,
        cnae_fiscal_descricao: 'Distribuição de energia elétrica',
        municipio: 'CURITIBA',
        uf: 'PR',
      }), { status: 200 }),
    )

    await lookupCnpj('49449868000162')

    // Should have inserted history records for changed fields
    expect(mockHistoryInsert).toHaveBeenCalled()
    const historyCalls = mockHistoryInsert.mock.calls
    const changedFields = historyCalls.map((call: unknown[]) => (call[0] as Record<string, unknown>).field_changed)
    expect(changedFields).toContain('legal_name')
    expect(changedFields).toContain('city')
    expect(changedFields).toContain('state')
  })
})

describe('verifyCnpjExists', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    singleResults = []
  })

  it("returns 'exists' when BrasilAPI returns 200", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ cnpj: '49449868000162' }), { status: 200 }))

    const status = await verifyCnpjExists('49449868000162')
    expect(status).toBe('exists')
    expect(fetchSpy).toHaveBeenCalledTimes(1) // ReceitaWS not consulted on success
  })

  it("returns 'not-found' when BrasilAPI returns 404", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const status = await verifyCnpjExists('00000000000000')
    expect(status).toBe('not-found')
  })

  it("falls back to ReceitaWS on BrasilAPI server error and returns 'exists' when found", async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'OK', nome: 'COMPANY' }), { status: 200 }),
      )

    const status = await verifyCnpjExists('49449868000162')
    expect(status).toBe('exists')
  })

  it("returns 'not-found' when ReceitaWS returns 200 with status: 'ERROR'", async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ERROR', message: 'CNPJ inválido' }), { status: 200 }),
      )

    const status = await verifyCnpjExists('49449868000162')
    expect(status).toBe('not-found')
  })

  it("returns 'unreachable' when both providers fail with non-404 errors", async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Error', { status: 503 }))

    const status = await verifyCnpjExists('49449868000162')
    expect(status).toBe('unreachable')
  })

  it("returns 'not-found' when ReceitaWS 404s after BrasilAPI 5xx", async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    const status = await verifyCnpjExists('49449868000162')
    expect(status).toBe('not-found')
  })

  it('strips formatting characters before calling the API', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ cnpj: '49449868000162' }), { status: 200 }))

    await verifyCnpjExists('49.449.868/0001-62')
    const url = (fetchSpy.mock.calls[0][0] as string) ?? ''
    // The CNPJ portion of the URL must be the 14 digits with no separators.
    expect(url).toMatch(/\/49449868000162$/)
  })
})
