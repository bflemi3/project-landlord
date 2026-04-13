import { describe, it, expect, vi, beforeEach } from 'vitest'
import { externalCall, externalFetch } from '../call'

// Mock Supabase so logCall doesn't require a real DB connection in tests
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

describe('externalCall', () => {
  it('returns success with data and duration', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => ({ value: 42 }),
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ value: 42 })
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.service).toBe('test-service')
    expect(result.operation).toBe('test-op')
    expect(result.timestamp).toBeDefined()
  })

  it('captures and normalizes errors', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => { throw new Error('connection refused') },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error!.category).toBe('unknown')
    expect(result.error!.message).toBe('connection refused')
    expect(result.error!.service).toBe('test-service')
    expect(result.error!.operation).toBe('test-op')
  })

  it('tracks duration even on failure', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => { throw new Error('fail') },
    })

    expect(result.duration).toBeGreaterThanOrEqual(0)
  })
})

describe('externalFetch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns parsed JSON on 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'test' }), { status: 200 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'test' })
  })

  it('categorizes 4xx as client_error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not found', { status: 404 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('client_error')
    expect(result.error!.statusCode).toBe(404)
  })

  it('categorizes 5xx as server_error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal error', { status: 500 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('server_error')
    expect(result.error!.statusCode).toBe(500)
  })

  it('categorizes network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('fetch failed'),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('network')
  })

  it('detects unexpected response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
      validateShape: (data: unknown) => {
        const d = data as Record<string, unknown>
        return 'name' in d
      },
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('unexpected_shape')
  })
})
