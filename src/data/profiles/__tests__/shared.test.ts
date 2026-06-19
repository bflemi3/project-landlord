import { describe, it, expect } from 'vitest'
import { fetchProfile, profileQueryKey } from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

function mockSupabase(overrides: {
  user?: unknown
  profileData?: unknown
  profileError?: unknown
}) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: overrides.user ?? null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: overrides.profileData ?? null,
              error: overrides.profileError ?? null,
            }),
        }),
      }),
    }),
  } as unknown as TypedSupabaseClient
}

describe('fetchProfile', () => {
  it('returns null when no user', async () => {
    const result = await fetchProfile(mockSupabase({ user: null }))
    expect(result).toBeNull()
  })

  it('returns null on profile query error', async () => {
    const result = await fetchProfile(
      mockSupabase({
        user: { id: 'u1' },
        profileError: { message: 'fail' },
      }),
    )
    expect(result).toBeNull()
  })

  it('returns the profile row verbatim from Supabase', async () => {
    const row = {
      id: 'u1',
      acquisition_channel: null,
      analytics_opt_out: false,
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      email: 'joao@test.com',
      full_name: 'João Silva',
      has_redeemed_invite: true,
      phone: null,
      preferred_locale: 'pt-BR',
      tax_id: '040.032.329-09',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const result = await fetchProfile(
      mockSupabase({
        user: { id: 'u1' },
        profileData: row,
      }),
    )
    expect(result).toEqual(row)
  })
})

describe('profileQueryKey', () => {
  it('returns stable key', () => {
    expect(profileQueryKey()).toEqual(['profile'])
  })
})
