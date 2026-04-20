/**
 * Unit tests for the `redeemInviteByCodeCore` wrapper around the `redeem_invite`
 * SECURITY DEFINER RPC.
 *
 * The wrapper has a narrow but important job: normalize every outcome into the
 * `{ success, reason?, source? }` shape callers (route handlers, server actions)
 * depend on. Callers branch on `reason` for logging + UX decisions, so the
 * contract must be watertight.
 *
 * Most of these tests pin currently-correct behavior so refactors can't silently
 * drop a code path. The thrown-exception test is EXPECTED TO FAIL — today the
 * wrapper does not catch exceptions from `.rpc()`, which means an unexpected
 * Supabase client error propagates as an unhandled rejection instead of a
 * normalized `rpc_error`.
 */
import { describe, it, expect, vi } from 'vitest'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { redeemInviteByCodeCore } from '@/data/profiles/actions/redeem-invite-by-code'

function makeClient(rpcImpl: (fn: string, args: unknown) => unknown): TypedSupabaseClient {
  return { rpc: vi.fn(rpcImpl) } as unknown as TypedSupabaseClient
}

describe('redeemInviteByCodeCore — error shape normalization', () => {
  it('returns { success: false, reason: "rpc_error" } when .rpc() returns an error', async () => {
    const client = makeClient(async () => ({
      data: null,
      error: { message: 'connection refused', code: '08006' },
    }))

    const result = await redeemInviteByCodeCore(client, 'user-1', 'ANY-CODE')

    expect(result).toEqual({ success: false, reason: 'rpc_error' })
  })

  it('returns { success: false, reason: "rpc_empty" } when .rpc() returns no data', async () => {
    const client = makeClient(async () => ({ data: null, error: null }))

    const result = await redeemInviteByCodeCore(client, 'user-1', 'ANY-CODE')

    expect(result).toEqual({ success: false, reason: 'rpc_empty' })
  })

  it('passes through success payload including source', async () => {
    const client = makeClient(async () => ({
      data: { success: true, source: 'direct' },
      error: null,
    }))

    const result = await redeemInviteByCodeCore(client, 'user-1', 'VALID-CODE')

    expect(result).toEqual({ success: true, source: 'direct' })
  })

  it('passes through structured failure reasons (invalid_or_mismatch)', async () => {
    const client = makeClient(async () => ({
      data: { success: false, reason: 'invalid_or_mismatch' },
      error: null,
    }))

    const result = await redeemInviteByCodeCore(client, 'user-1', 'WRONG-CODE')

    expect(result).toEqual({ success: false, reason: 'invalid_or_mismatch' })
  })

  it('passes through structured failure reasons (profile_missing)', async () => {
    const client = makeClient(async () => ({
      data: { success: false, reason: 'profile_missing' },
      error: null,
    }))

    const result = await redeemInviteByCodeCore(client, 'user-1', 'VALID-CODE')

    expect(result).toEqual({ success: false, reason: 'profile_missing' })
  })

  it('passes the invite code through to the RPC call unchanged', async () => {
    const rpcFn = vi.fn(async () => ({
      data: { success: true, source: 'direct' },
      error: null,
    }))
    const client = { rpc: rpcFn } as unknown as TypedSupabaseClient

    await redeemInviteByCodeCore(client, 'user-1', '  My-Code-123  ')

    expect(rpcFn).toHaveBeenCalledWith('redeem_invite', { invite_code: '  My-Code-123  ' })
  })

  it('normalizes thrown exceptions from .rpc() to rpc_error (no unhandled rejection)', async () => {
    // If the Supabase client itself throws (network layer, mis-serialized JWT,
    // etc.), callers still need a structured { success: false, reason }. An
    // unhandled rejection crashes the request and leaks a 500 to the user with
    // no observability into which call site failed.
    const client = makeClient(async () => {
      throw new Error('network down')
    })

    const result = await redeemInviteByCodeCore(client, 'user-1', 'ANY-CODE')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('rpc_error')
  })
})
