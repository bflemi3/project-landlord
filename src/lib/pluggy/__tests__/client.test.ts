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
