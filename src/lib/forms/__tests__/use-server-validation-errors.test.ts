import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useServerValidationErrors } from '../use-server-validation-errors'

interface TestFields {
  name: string
  postal_code: string
}

describe('useServerValidationErrors', () => {
  it('stores server field errors and exposes field helpers', () => {
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())

    act(() => {
      result.current.setServerErrors({
        name: ['required'],
        general: ['failed'],
      })
    })

    expect(result.current.hasServerError('name')).toBe(true)
    expect(result.current.getServerError('name')).toBe('required')
    expect(result.current.serverErrors.general).toEqual(['failed'])
  })

  it('clears a single field error without removing other errors', () => {
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())

    act(() => {
      result.current.setServerErrors({
        name: ['required'],
        postal_code: ['invalidPostalCode'],
      })
      result.current.clearServerErrors('name')
    })

    expect(result.current.hasServerError('name')).toBe(false)
    expect(result.current.hasServerError('postal_code')).toBe(true)
  })

  it('clears all errors when called without fields', () => {
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())

    act(() => {
      result.current.setServerErrors({ name: ['required'] })
      result.current.clearServerErrors()
    })

    expect(result.current.serverErrors).toEqual({})
  })

  it('merges client and server field error presence', () => {
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())
    const form = {
      errors: { name: ['clientRequired'] },
      hasError: (field: string) => field === 'name',
    }

    act(() => {
      result.current.setServerErrors({ postal_code: ['invalidPostalCode'] })
    })

    expect(result.current.hasFieldError(form, 'name')).toBe(true)
    expect(result.current.hasFieldError(form, 'postal_code')).toBe(true)
  })

  it('returns the same state reference when clearing fields that are already absent', () => {
    // Referential stability matters: consumers may call clearServerErrors
    // inside a `useEffect` whose deps include `serverErrors`. Returning a
    // fresh object on a no-op clear would loop the effect.
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())

    act(() => {
      result.current.setServerErrors({ name: ['required'] })
    })
    const before = result.current.serverErrors

    act(() => {
      result.current.clearServerErrors('postal_code')
    })

    expect(result.current.serverErrors).toBe(before)
    expect(result.current.serverErrors.name).toEqual(['required'])
  })

  it('prefers client field error messages before server field error messages', () => {
    const { result } = renderHook(() => useServerValidationErrors<TestFields>())
    const form = {
      errors: { name: ['clientRequired'] },
      hasError: (field: string) => field === 'name',
    }

    act(() => {
      result.current.setServerErrors({
        name: ['serverRequired'],
        postal_code: ['invalidPostalCode'],
      })
    })

    expect(result.current.getFieldError(form, 'name')).toBe('clientRequired')
    expect(result.current.getFieldError(form, 'postal_code')).toBe('invalidPostalCode')
  })
})
