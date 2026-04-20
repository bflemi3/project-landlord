/**
 * Unit tests for the redeemInviteCode server action's rpc_error propagation.
 *
 * The action wraps redeemInviteByCodeCore. On rpc_error, the reason must flow
 * to the caller so the UI (src/app/auth/enter-code/page.tsx) can distinguish
 * "server error, try again" from "your code is wrong".
 *
 * These tests describe desired behavior and are EXPECTED TO FAIL against the
 * current implementation, which returns only `success` to the form and discards
 * the reason on the client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const redeemCoreMock = vi.fn()
const getUserMock = vi.fn()
const refreshSessionMock = vi.fn()

vi.mock('@/data/profiles/actions/redeem-invite-by-code', () => ({
  redeemInviteByCodeCore: (...args: unknown[]) => redeemCoreMock(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
    },
  }),
}))

const { redeemInviteCode } = await import('@/app/actions/redeem-invite')

describe('redeemInviteCode server action — rpc_error propagation', () => {
  beforeEach(() => {
    redeemCoreMock.mockReset()
    getUserMock.mockReset()
    refreshSessionMock.mockReset()
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns rpc_error reason to the client for distinct UI handling', async () => {
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'rpc_error' })

    const result = await redeemInviteCode('ANY-CODE')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('rpc_error')
  })

  it('returns invalid_or_mismatch reason unchanged', async () => {
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'invalid_or_mismatch' })

    const result = await redeemInviteCode('WRONG-CODE')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('invalid_or_mismatch')
  })

  it('does not call refreshSession when redemption failed with rpc_error', async () => {
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'rpc_error' })

    await redeemInviteCode('ANY-CODE')

    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('returns success:false without a reason when user is unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const result = await redeemInviteCode('ANY-CODE')

    expect(result.success).toBe(false)
    expect(redeemCoreMock).not.toHaveBeenCalled()
  })

  it('returns rpc_empty reason unchanged (null RPC payload)', async () => {
    // rpc_empty signals the RPC returned `null` instead of a structured reason
    // — caller must be able to see this distinctly from rpc_error so the UI
    // and logs can differentiate "DB error" from "DB returned nothing".
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })

    const result = await redeemInviteCode('ANY-CODE')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('rpc_empty')
  })

  it('returns profile_missing reason unchanged', async () => {
    // profile_missing indicates a broken signup trigger (user auth row exists
    // but no profile row). The action must propagate this so operators can
    // distinguish it from a user typing the wrong code.
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'profile_missing' })

    const result = await redeemInviteCode('ANY-CODE')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('profile_missing')
  })

  it('does not call refreshSession on rpc_empty', async () => {
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })

    await redeemInviteCode('ANY-CODE')

    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('does not call refreshSession on profile_missing', async () => {
    redeemCoreMock.mockResolvedValue({ success: false, reason: 'profile_missing' })

    await redeemInviteCode('ANY-CODE')

    expect(refreshSessionMock).not.toHaveBeenCalled()
  })

  it('propagates source on success', async () => {
    redeemCoreMock.mockResolvedValue({ success: true, source: 'direct' })

    const result = await redeemInviteCode('VALID-CODE')

    expect(result.success).toBe(true)
    expect(result.source).toBe('direct')
  })
})
