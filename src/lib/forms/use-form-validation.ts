import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, readonly string[] | undefined>

export type ValidationResult<TOutput> =
  | { success: true; data: TOutput }
  | { success: false; errors: FieldErrors }

export interface Validator<TInput, TOutput = TInput> {
  parse(input: TInput): ValidationResult<TOutput>
}

// ---------------------------------------------------------------------------
// Zod adapter
// ---------------------------------------------------------------------------

export function zodValidator<S extends z.ZodType>(
  schema: S,
): Validator<z.input<S>, z.output<S>> {
  return {
    parse(input) {
      const r = schema.safeParse(input)
      return r.success
        ? { success: true, data: r.data }
        : { success: false, errors: z.flattenError(r.error).fieldErrors }
    },
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFormValidationOptions<TInput, TOutput> {
  values: TInput
  validator: Validator<TInput, TOutput>
}

export interface UseFormValidationReturn<TOutput> {
  isValid: boolean
  errors: FieldErrors
  markTouched: (field: string) => void
  hasError: (field: string) => boolean
  validate: () => ValidationResult<TOutput>
}

export function useFormValidation<TInput, TOutput>(
  opts: UseFormValidationOptions<TInput, TOutput>,
): UseFormValidationReturn<TOutput> {
  const { values, validator } = opts

  const [touched, setTouched] = useState<Record<string, true>>(() => ({}))

  const parseResult = useMemo(
    () => validator.parse(values),
    [values, validator],
  )

  const allErrors = useMemo<FieldErrors>(
    () => (parseResult.success ? {} : parseResult.errors),
    [parseResult],
  )

  const touchedRef = useRef(touched)
  const allErrorsRef = useRef(allErrors)
  const parseResultRef = useRef(parseResult)
  
  useEffect(() => {
    touchedRef.current = touched
    allErrorsRef.current = allErrors
    parseResultRef.current = parseResult
  })

  

  const errors = useMemo<FieldErrors>(() => {
    const filtered: FieldErrors = {}
    for (const field of Object.keys(touched)) {
      if (allErrors[field]) {
        filtered[field] = allErrors[field]
      }
    }
    return filtered
  }, [touched, allErrors])

  

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => {
      if (prev[field]) return prev
      return { ...prev, [field]: true }
    })
  }, [])

  const hasError = useCallback(
    (field: string) => touchedRef.current[field] && allErrorsRef.current[field] != null,
    [],
  )

  const validate = useCallback((): ValidationResult<TOutput> => {
    const result = parseResultRef.current
    if (!result.success) {
      setTouched((prev) => {
        const keys = Object.keys(result.errors)
        if (keys.every((k) => prev[k])) return prev
        const next = { ...prev }
        for (const key of keys) next[key] = true
        return next
      })
    }
    return result
  }, [])

  return {
    isValid: parseResult.success,
    errors,
    markTouched,
    hasError,
    validate,
  }
}
