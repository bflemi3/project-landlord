import { describe, it, expect } from 'vitest'
import { fetchProfile, profileQueryKey } from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

function mockSupabase(overrides: { user?: unknown; profileData?: unknown; profileError?: unknown }) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: overrides.user ?? null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
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
    const result = await fetchProfile(mockSupabase({
      user: { id: 'u1' },
      profileError: { message: 'fail' },
    }))
    expect(result).toBeNull()
  })

  it('maps profile data correctly', async () => {
    const result = await fetchProfile(mockSupabase({
      user: { id: 'u1' },
      profileData: {
        id: 'u1',
        full_name: 'João Silva',
        email: 'joao@test.com',
        avatar_url: 'https://example.com/avatar.jpg',
        preferred_locale: 'pt-BR',
      },
    }))
    expect(result).toEqual({
      id: 'u1',
      fullName: 'João Silva',
      email: 'joao@test.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      preferredLocale: 'pt-BR',
      pixKey: null,
      pixKeyType: null,
    })
  })
})

describe('profileQueryKey', () => {
  it('returns stable key', () => {
    expect(profileQueryKey()).toEqual(['profile'])
  })
})
