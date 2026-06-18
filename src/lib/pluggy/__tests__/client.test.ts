import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('pluggy client: access-token cache', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PLUGGY_CLIENT_ID = 'test-client-id'
    process.env.PLUGGY_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mints once on first call and serves the cached key on the second call', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) {
        return new Response(JSON.stringify({ apiKey: 'cached-api-key' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getApiKey, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    const k1 = await getApiKey()
    const k2 = await getApiKey()

    expect(k1).toBe('cached-api-key')
    expect(k2).toBe('cached-api-key')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws a clear error when credentials are missing', async () => {
    delete process.env.PLUGGY_CLIENT_ID
    delete process.env.PLUGGY_CLIENT_SECRET

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { getApiKey, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    await expect(getApiKey()).rejects.toThrow(/PLUGGY_CLIENT_ID/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('propagates a useful error on non-2xx /auth response', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('forbidden', { status: 403 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getApiKey, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    await expect(getApiKey()).rejects.toThrow(/Pluggy auth failed.*403/)
  })
})

describe('pluggy client: getTransactions', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PLUGGY_CLIENT_ID = 'test-client-id'
    process.env.PLUGGY_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetchWithAuth(handler: (url: string) => Response | Promise<Response>) {
    return vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) {
        return new Response(JSON.stringify({ apiKey: 'k' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return handler(url)
    })
  }

  it('builds the correct URL with itemId + accountId + pageSize', async () => {
    let capturedUrl = ''
    const fetchMock = mockFetchWithAuth((url) => {
      capturedUrl = url
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getTransactions, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    await getTransactions('item-1', {
      accountId: 'acct-1',
      from: '2026-06-01',
      to: '2026-06-30',
      pageSize: 200,
    })

    expect(capturedUrl).toContain('/transactions?')
    expect(capturedUrl).toContain('itemId=item-1')
    expect(capturedUrl).toContain('accountId=acct-1')
    expect(capturedUrl).toContain('from=2026-06-01')
    expect(capturedUrl).toContain('to=2026-06-30')
    expect(capturedUrl).toContain('pageSize=200')
  })

  it('returns the parsed results array', async () => {
    const sampleTx = {
      id: 'tx-1',
      accountId: 'acct-1',
      date: '2026-07-02T10:00:00Z',
      description: 'Pix',
      amount: 2500,
      currencyCode: 'BRL',
      type: 'CREDIT' as const,
    }
    const fetchMock = mockFetchWithAuth(() => {
      return new Response(JSON.stringify({ results: [sampleTx] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getTransactions, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    const result = await getTransactions('item-1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'tx-1', amount: 2500, type: 'CREDIT' })
  })

  it('throws a useful error on non-2xx', async () => {
    const fetchMock = mockFetchWithAuth(() => new Response('bad', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const { getTransactions, __resetPluggyClientForTests } = await import('../client')
    __resetPluggyClientForTests()

    await expect(getTransactions('item-1')).rejects.toThrow(
      /Pluggy GET \/transactions failed.*500/,
    )
  })
})
