import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEnlivDebitos, fetchEnlivPagas } from '../api-client'

describe('fetchEnlivDebitos', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches debitos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: 'Test', debitos: [{ id: '1', valor: 218.47 }] }), { status: 200 }),
    )
    const result = await fetchEnlivDebitos('04003232909')
    expect(result.debitos[0].valor).toBe(218.47)
  })

  it('strips formatting', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: '', debitos: [] }), { status: 200 }),
    )
    await fetchEnlivDebitos('040.032.329-09')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/04003232909/'), expect.anything())
  })

  it('throws on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not found', { status: 404 }))
    await expect(fetchEnlivDebitos('000')).rejects.toThrow()
  })
})

describe('fetchEnlivPagas', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches paid invoices', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: 'Test', debitos: [] }), { status: 200 }),
    )
    await fetchEnlivPagas('04003232909')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/resumo-pagas?page=1'), expect.anything())
  })
})
