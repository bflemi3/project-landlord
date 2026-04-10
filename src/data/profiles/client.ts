'use client'

import { createSuspenseHook } from '../shared/create-hook'
import { fetchProfile, profileQueryKey, type UserProfile } from './shared'

export const useProfile = createSuspenseHook<UserProfile | null, []>(
  profileQueryKey,
  fetchProfile,
)

export type { UserProfile } from './shared'
