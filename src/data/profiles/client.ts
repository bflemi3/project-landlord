'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateName } from './actions/update-name'
import { updateTaxId } from './actions/update-tax-id'
import { createSuspenseHook } from '../shared/create-hook'
import { fetchProfile, profileQueryKey, type UserProfile } from './shared'
import type { NameInput, TaxIdInput } from '@/schemas/profile'
import type { ValidationFieldErrors } from '@/lib/validation'

export const useProfile = createSuspenseHook<UserProfile | null, []>(
  profileQueryKey,
  fetchProfile,
)

// =============================================================================
// Mutations
//
// Mutation lifecycle (validation → server action → cache invalidation) lives
// here so consumers don't repeat it. Each mutationFn throws the typed error
// shape on validation failure; consumers attach per-call `onSuccess`/`onError`
// callbacks for UI state side effects (dirty tracking, surfacing errors into a
// form's server-error store), and the hook-level `onSuccess` invalidates the
// shared profile query so all readers (avatar trigger, settings sections)
// re-render in lockstep.
// =============================================================================

type MutationError<T> = { errors: ValidationFieldErrors<T> }

export function useUpdateNameMutation() {
  const queryClient = useQueryClient()
  return useMutation<NameInput, MutationError<NameInput>, string>({
    mutationFn: async (raw) => {
      const result = await updateName(raw)
      if (!result.valid) throw { errors: result.errors ?? {} }
      return result.fields!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey() })
    },
  })
}

export function useUpdateTaxIdMutation() {
  const queryClient = useQueryClient()
  return useMutation<TaxIdInput, MutationError<TaxIdInput>, string>({
    mutationFn: async (raw) => {
      const result = await updateTaxId(raw)
      if (!result.valid) throw { errors: result.errors ?? {} }
      return result.fields!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey() })
    },
  })
}

export type { UserProfile } from './shared'
export type { NameInput, TaxIdInput } from '@/schemas/profile'
