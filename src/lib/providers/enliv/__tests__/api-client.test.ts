import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEnlivDebitos } from '../api-client'

describe('fetchEnlivDebitos', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns debitos for a valid CPF', async () => {
    const mockResponse: unknown = {
      nome_cliente: 'Test User',
      debitos: [
        {
          id: 'abc-123',
          cadastroDistribuidora: '59069412',
          cadastroAuxDistribuidora: null,
          endereco: 'Rua Test, 123',
          vencimento: '2026-04-24',
          status: 'PENDENTE',
          valor: 218.47,
          link: '/v1/cobrancas/id/abc-123/get-relatorio',
          linha_digitavel: '74891.16009 06660.307304 32263.871033 5 14260000021847',
          emv_pix: 'pix-payload-here',
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const result = await fetchEnlivDebitos('04003232909')

    expect(fetch).toHaveBeenCalledWith(
      'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com/v1/cobrancas/cliente/04003232909/resumo-debitos',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result.nome_cliente).toBe('Test User')
    expect(result.debitos).toHaveLength(1)
    expect(result.debitos[0].valor).toBe(218.47)
    expect(result.debitos[0].status).toBe('PENDENTE')
  })

  it('strips formatting from CPF input', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: '', debitos: [] }), { status: 200 }),
    )

    await fetchEnlivDebitos('040.032.329-09')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/04003232909/'),
      expect.anything(),
    )
  })

  it('throws on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not found', { status: 404 }),
    )

    await expect(fetchEnlivDebitos('00000000000')).rejects.toThrow(
      'Enliv API returned 404',
    )
  })
})
