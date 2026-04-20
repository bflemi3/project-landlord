/**
 * Unit tests for the `/auth/callback` route handler's error handling.
 *
 * The callback route currently discards the result of redeemInviteByCodeCore
 * entirely on both the pending_invite_code cookie path (Google OAuth) and the
 * user_metadata.invite_code path (email signup). An rpc_error here is invisible:
 * the user lands on /app with a stale claim and middleware silently bounces them
 * to /auth/enter-code with no explanation.
 *
 * These tests describe desired observability behavior and are EXPECTED TO FAIL
 * against the current implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const redeemMock = vi.fn()
const exchangeMock = vi.fn()
const refreshSessionMock = vi.fn()
const profilesUpdateMock = vi.fn()

vi.mock('@/data/profiles/actions/redeem-invite-by-code', () => ({
  redeemInviteByCodeCore: (...args: unknown[]) => redeemMock(...args),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
    },
    from: () => ({
      update: () => ({
        eq: (...args: unknown[]) => profilesUpdateMock(...args),
      }),
    }),
  }),
}))

const { GET } = await import('@/app/auth/callback/route')

function makeRequest(params: Record<string, string>, cookies: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/auth/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const req = new NextRequest(url.toString())
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v)
  return req
}

describe('/auth/callback route — redemption rpc_error handling', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
    redeemMock.mockReset()
    exchangeMock.mockReset()
    refreshSessionMock.mockReset()
    profilesUpdateMock.mockReset()
    exchangeMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1', user_metadata: {} } } },
      error: null,
    })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('logs rpc_error on pending_invite_code (OAuth) redemption failure', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    await GET(makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }))

    expect(errorSpy).toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).toMatch(/rpc_error/)
  })

  it('logs rpc_error on signup user_metadata.invite_code redemption failure', async () => {
    exchangeMock.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', user_metadata: { invite_code: 'INVITE-CODE' } },
        },
      },
      error: null,
    })
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    await GET(makeRequest({ code: 'signup-exchange-code', type: 'signup' }))

    expect(errorSpy).toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).toMatch(/rpc_error/)
  })

  it('does not log for expected invalid_or_mismatch on OAuth path', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'invalid_or_mismatch' })
    await GET(makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'BAD-CODE' }))

    // Legit user error (expired / wrong account). Not log-worthy.
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('clears pending_invite_code cookie even on rpc_error (prevents infinite retry)', async () => {
    // If we leave the cookie behind, the next /auth/callback hit retries a
    // doomed redemption and the user is stuck in the loop.
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(
      makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }),
    )

    const cleared = res.cookies.get('pending_invite_code')
    expect(cleared?.value).toBe('')
    expect(cleared?.maxAge).toBe(0)
  })

  it('logs rpc_empty with the reason for OAuth redemption failure', async () => {
    // rpc_empty is the wrapper's signal that the RPC returned `null` instead of
    // a structured reason — almost always an upstream misconfiguration. Must
    // surface in logs so production regressions are debuggable.
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })
    await GET(makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }))

    expect(errorSpy).toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).toMatch(/rpc_empty/)
  })

  // -------------------------------------------------------------------------
  // On rpc_error the callback route currently falls through to /app (OAuth)
  // or /auth/verified (signup). The user lands at those routes without the
  // has_redeemed_invite JWT claim, middleware silently bounces them to
  // /auth/enter-code, and they see no error at all — just "enter a code"
  // when they already entered one. The route must redirect directly to
  // /auth/enter-code?error=server so the UI can surface what happened.
  // -------------------------------------------------------------------------
  it('redirects to /auth/enter-code?error=server on rpc_error (OAuth path)', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(
      makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }),
    )

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/auth\/enter-code/)
    expect(location).toMatch(/error=server|reason=rpc_error/)
    expect(location).not.toMatch(/\/app(\?|$)/)
  })

  it('redirects to /auth/enter-code?error=server on rpc_error (signup path)', async () => {
    exchangeMock.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', user_metadata: { invite_code: 'INVITE-CODE' } },
        },
      },
      error: null,
    })
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(makeRequest({ code: 'signup-exchange-code', type: 'signup' }))

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/auth\/enter-code/)
    expect(location).toMatch(/error=server|reason=rpc_error/)
    expect(location).not.toMatch(/\/auth\/verified/)
  })

  it('redirects to /auth/enter-code?error=server on rpc_empty (OAuth path)', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })
    const res = await GET(
      makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }),
    )

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/auth\/enter-code/)
    expect(location).toMatch(/error=server|reason=rpc_empty/)
  })

  it('still redirects to /app on successful OAuth redemption (pin the happy path)', async () => {
    redeemMock.mockResolvedValue({ success: true, source: 'direct' })
    const res = await GET(
      makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'INVITE-CODE' }),
    )

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/app/)
    expect(location).not.toMatch(/\/auth\/enter-code/)
  })

  // Mirror of the /auth/redeem invariant: preserve the invite code in the
  // error redirect so the enter-code form can pre-populate and the user
  // retries with a single click, not a re-entry.
  it('preserves invite code in OAuth rpc_error redirect', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(
      makeRequest({ code: 'oauth-exchange-code' }, { pending_invite_code: 'MY-INVITE-CODE' }),
    )

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/code=MY-INVITE-CODE/)
  })

  it('preserves invite code in signup rpc_error redirect', async () => {
    exchangeMock.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', user_metadata: { invite_code: 'SIGNUP-CODE' } },
        },
      },
      error: null,
    })
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(makeRequest({ code: 'signup-exchange-code', type: 'signup' }))

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/code=SIGNUP-CODE/)
  })
})
