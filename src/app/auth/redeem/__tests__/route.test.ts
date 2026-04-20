/**
 * Unit tests for the `/auth/redeem` route handler's error handling.
 *
 * Focus: when redeemInviteByCodeCore returns { success: false, reason: 'rpc_error' },
 * the route must distinguish this from legitimate-input failures ('invalid_or_mismatch',
 * 'profile_missing') so (a) users see an accurate message, (b) rpc_error is observable
 * in server logs for debugging production regressions.
 *
 * These tests describe the desired behavior and are EXPECTED TO FAIL against the
 * current implementation, which collapses every failure reason to ?error=invalid and
 * logs nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const redeemMock = vi.fn()
const getUserMock = vi.fn()
const refreshSessionMock = vi.fn()

vi.mock('@/data/profiles/actions/redeem-invite-by-code', () => ({
  redeemInviteByCodeCore: (...args: unknown[]) => redeemMock(...args),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
    },
  }),
}))

const { GET } = await import('@/app/auth/redeem/route')

function makeRequest(code = 'VALID-CODE', next?: string): NextRequest {
  const url = new URL('http://localhost/auth/redeem')
  url.searchParams.set('code', code)
  if (next) url.searchParams.set('next', next)
  return new NextRequest(url.toString())
}

describe('/auth/redeem route — rpc_error handling', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
    redeemMock.mockReset()
    getUserMock.mockReset()
    refreshSessionMock.mockReset()
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('logs rpc_error with the reason so production regressions are observable', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    await GET(makeRequest())

    expect(errorSpy).toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).toMatch(/rpc_error/)
  })

  it('redirects rpc_error to a distinct error state (not ?error=invalid)', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(makeRequest())
    const location = res.headers.get('location') ?? ''

    // An rpc_error is "our problem", not "your code is wrong". Users shouldn't be
    // told their code is invalid when the server failed. The redirect must surface
    // a distinguishable state (e.g., ?error=server, ?reason=rpc_error).
    expect(location).not.toMatch(/error=invalid(&|$)/)
    expect(location).toMatch(/error=server|reason=rpc_error/)
  })

  it('does not log for legitimate invalid_or_mismatch — that is user-input error', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'invalid_or_mismatch' })
    await GET(makeRequest())

    // invalid_or_mismatch is expected user error (wrong code / wrong account).
    // Logging every one would be noise. Only rpc_error / profile_missing should log.
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('logs profile_missing — indicates a broken signup trigger, not user error', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'profile_missing' })
    await GET(makeRequest())

    expect(errorSpy).toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).toMatch(/profile_missing/)
  })

  // refreshSession() rotates the JWT cookie to pick up the newly-set
  // has_redeemed_invite claim. Calling it after a FAILED redemption would
  // either be a no-op (wasteful) or, worse, issue a cookie that asserts a
  // state the DB does not actually hold. The route must only refresh on
  // success. These tests pin that invariant across every failure reason.
  it('does not call refreshSession on rpc_error', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    await GET(makeRequest())
    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('does not call refreshSession on rpc_empty', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })
    await GET(makeRequest())
    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('does not call refreshSession on invalid_or_mismatch', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'invalid_or_mismatch' })
    await GET(makeRequest())
    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('does not call refreshSession on profile_missing', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'profile_missing' })
    await GET(makeRequest())
    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('calls refreshSession exactly once on success', async () => {
    redeemMock.mockResolvedValue({ success: true, source: 'direct' })
    await GET(makeRequest())
    expect(refreshSessionMock).toHaveBeenCalledTimes(1)
  })

  // After a server-side failure (rpc_error / rpc_empty) the route redirects
  // the user to /auth/enter-code. Preserving the invite code in the redirect
  // lets the form pre-populate — otherwise the user has to re-enter a code
  // they already submitted once just to retry a failure that wasn't their
  // fault. Small UX win, but meaningful for the calm/trust-first product feel.
  it('preserves the invite code in the error redirect on rpc_error', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    const res = await GET(makeRequest('MY-INVITE-CODE'))

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/code=MY-INVITE-CODE/)
  })

  it('preserves the invite code in the error redirect on rpc_empty', async () => {
    redeemMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })
    const res = await GET(makeRequest('ANOTHER-CODE'))

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/code=ANOTHER-CODE/)
  })
})
