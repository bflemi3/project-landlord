import { useCallback, useState } from 'react'

import type { ValidationFieldErrors } from '@/lib/validation'
import type { UseFormValidationReturn } from './use-form-validation'

export function useServerValidationErrors<TFields>() {
  const [serverErrors, setServerErrors] =
    useState<ValidationFieldErrors<TFields>>({})

  const clearServerErrors = useCallback(
    (...fields: Array<keyof TFields & string>) => {
      setServerErrors((prev) => {
        if (fields.length === 0) return {}
        if (fields.every((field) => prev[field] == null)) return prev

        const next = { ...prev }
        for (const field of fields) {
          delete next[field]
        }
        return next
      })
    },
    [],
  )

  const hasServerError = useCallback(
    (field: keyof TFields & string) => serverErrors[field] != null,
    [serverErrors],
  )

  const getServerError = useCallback(
    (field: keyof TFields & string) => serverErrors[field]?.[0],
    [serverErrors],
  )

  const hasFieldError = useCallback(
    (
      form: Pick<UseFormValidationReturn<unknown>, 'hasError'>,
      field: keyof TFields & string,
    ) => form.hasError(field) || hasServerError(field),
    [hasServerError],
  )

  const getFieldError = useCallback(
    (
      form: Pick<UseFormValidationReturn<unknown>, 'errors'>,
      field: keyof TFields & string,
    ) => form.errors[field]?.[0] ?? getServerError(field),
    [getServerError],
  )

  return {
    serverErrors,
    setServerErrors,
    clearServerErrors,
    hasServerError,
    getServerError,
    hasFieldError,
    getFieldError,
  }
}
