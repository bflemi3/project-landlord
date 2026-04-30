import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { z } from 'zod'

import {
  useFormValidation,
  zodValidator,
  type Validator,
} from '../use-form-validation'

// ---------------------------------------------------------------------------
// Test schema — minimal, exercises required + optional + max-length
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, { error: 'required' }).max(50, { error: 'tooLong' }),
  email: z.string().min(1, { error: 'required' }).email({ error: 'invalidEmail' }),
  bio: z.string().max(200, { error: 'tooLong' }).default(''),
})

type TestInput = z.input<typeof schema>
type TestOutput = z.output<typeof schema>

const validator = zodValidator(schema)

const EMPTY: TestInput = { name: '', email: '', bio: '' }
const VALID: TestInput = { name: 'Ada', email: 'ada@example.com', bio: '' }

// ---------------------------------------------------------------------------
// zodValidator adapter
// ---------------------------------------------------------------------------

describe('zodValidator', () => {
  it('returns success with parsed data for valid input', () => {
    const result = validator.parse(VALID)
    expect(result).toEqual({ success: true, data: VALID })
  })

  it('returns field errors for invalid input', () => {
    const result = validator.parse(EMPTY)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
      expect(result.errors.email).toBeDefined()
      expect(result.errors.bio).toBeUndefined()
    }
  })

  it('maps multiple errors per field', () => {
    const multiSchema = z.object({
      password: z
        .string()
        .min(8, { error: 'tooShort' })
        .regex(/[A-Z]/, { error: 'needsUppercase' }),
    })
    const v = zodValidator(multiSchema)
    const result = v.parse({ password: 'ab' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.password!.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('passes through transformed data when TInput != TOutput', () => {
    const transformSchema = z.object({
      age: z.coerce.number().min(0),
    })
    const v = zodValidator(transformSchema)
    const result = v.parse({ age: '25' })
    expect(result).toEqual({ success: true, data: { age: 25 } })
  })
})

// ---------------------------------------------------------------------------
// useFormValidation — hook tests
// ---------------------------------------------------------------------------

function renderForm(values: TestInput = EMPTY) {
  return renderHook(
    ({ values: v }) => useFormValidation<TestInput, TestOutput>({ values: v, validator }),
    { initialProps: { values } },
  )
}

describe('useFormValidation', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('fresh form (no interaction)', () => {
    it('reports isValid false when required fields are empty', () => {
      const { result } = renderForm()
      expect(result.current.isValid).toBe(false)
    })

    it('exposes empty errors — no field has been touched', () => {
      const { result } = renderForm()
      expect(Object.keys(result.current.errors)).toHaveLength(0)
    })

    it('hasError returns false for all fields', () => {
      const { result } = renderForm()
      expect(result.current.hasError('name')).toBeFalsy()
      expect(result.current.hasError('email')).toBeFalsy()
    })
  })

  describe('valid values', () => {
    it('reports isValid true and errors empty', () => {
      const { result } = renderForm(VALID)
      expect(result.current.isValid).toBe(true)
      expect(Object.keys(result.current.errors)).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // markTouched
  // -------------------------------------------------------------------------

  describe('markTouched', () => {
    it('surfaces error for a touched invalid field', () => {
      const { result } = renderForm()
      act(() => result.current.markTouched('name'))
      expect(result.current.hasError('name')).toBe(true)
      expect(result.current.errors.name).toBeDefined()
    })

    it('does not surface error for a touched valid field', () => {
      const { result } = renderForm(VALID)
      act(() => result.current.markTouched('name'))
      expect(result.current.hasError('name')).toBeFalsy()
      expect(result.current.errors.name).toBeUndefined()
    })

    it('is idempotent — double-touch does not change errors identity', () => {
      const { result } = renderForm()
      act(() => result.current.markTouched('name'))
      const errorsAfterFirst = result.current.errors
      act(() => result.current.markTouched('name'))
      expect(result.current.errors).toBe(errorsAfterFirst)
    })

    it('only surfaces the touched field, not others', () => {
      const { result } = renderForm()
      act(() => result.current.markTouched('name'))
      expect(result.current.hasError('name')).toBe(true)
      expect(result.current.hasError('email')).toBeFalsy()
      expect(result.current.errors.email).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Fixing a field — error disappears
  // -------------------------------------------------------------------------

  describe('fixing a touched field', () => {
    it('removes error when values become valid', () => {
      const { result, rerender } = renderForm()
      act(() => result.current.markTouched('name'))
      expect(result.current.hasError('name')).toBeTruthy()

      rerender({ values: { ...EMPTY, name: 'Ada' } })
      expect(result.current.hasError('name')).toBeFalsy()
      expect(result.current.errors.name).toBeUndefined()
    })

    it('keeps hasError consistent with errors during value changes', () => {
      const { result, rerender } = renderForm()
      act(() => result.current.markTouched('name'))

      rerender({ values: { ...EMPTY, name: 'Ada' } })

      expect(result.current.hasError('name')).toBe(false)
      expect(result.current.errors.name).toBeUndefined()
    })

    it('keeps CEP-style field errors consistent while typing', () => {
      const cepSchema = z.object({
        postal_code: z.string().regex(/^\d{5}-\d{3}$/, { error: 'invalidPostalCode' }),
      })
      const cepValidator = zodValidator(cepSchema)
      const { result, rerender } = renderHook(
        ({ values }) => useFormValidation({ values, validator: cepValidator }),
        { initialProps: { values: { postal_code: '123' } } },
      )

      act(() => result.current.markTouched('postal_code'))
      expect(result.current.hasError('postal_code')).toBe(true)
      expect(result.current.errors.postal_code).toEqual(['invalidPostalCode'])

      rerender({ values: { postal_code: '01310-100' } })

      expect(result.current.hasError('postal_code')).toBe(false)
      expect(result.current.errors.postal_code).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // validate()
  // -------------------------------------------------------------------------

  describe('validate', () => {
    it('returns failure and promotes all failing fields into errors', () => {
      const { result } = renderForm()
      let validationResult: ReturnType<typeof result.current.validate>
      act(() => {
        validationResult = result.current.validate()
      })
      expect(validationResult!.success).toBe(false)
      expect(result.current.errors.name).toBeDefined()
      expect(result.current.errors.email).toBeDefined()
    })

    it('returns success with data when form is valid', () => {
      const { result } = renderForm(VALID)
      let validationResult: ReturnType<typeof result.current.validate>
      act(() => {
        validationResult = result.current.validate()
      })
      expect(validationResult!).toEqual({ success: true, data: VALID })
    })

    it('does not update touched when all failing fields are already touched', () => {
      const { result } = renderForm()
      act(() => {
        result.current.markTouched('name')
        result.current.markTouched('email')
      })
      const errorsBefore = result.current.errors
      act(() => result.current.validate())
      expect(result.current.errors).toBe(errorsBefore)
    })
  })

  // -------------------------------------------------------------------------
  // Referential stability
  // -------------------------------------------------------------------------

  describe('callback stability', () => {
    it('markTouched identity is stable across value changes', () => {
      const { result, rerender } = renderForm()
      const ref = result.current.markTouched
      rerender({ values: VALID })
      expect(result.current.markTouched).toBe(ref)
    })

    it('hasError identity is stable across value changes', () => {
      const { result, rerender } = renderForm()
      const ref = result.current.hasError
      rerender({ values: VALID })
      expect(result.current.hasError).toBe(ref)
    })

    it('validate identity is stable across value changes', () => {
      const { result, rerender } = renderForm()
      const ref = result.current.validate
      rerender({ values: VALID })
      expect(result.current.validate).toBe(ref)
    })
  })

  // -------------------------------------------------------------------------
  // Custom (non-Zod) validator
  // -------------------------------------------------------------------------

  describe('custom validator', () => {
    it('works with a plain Validator implementation', () => {
      const custom: Validator<{ x: string }, { x: string }> = {
        parse(input) {
          return input.x.length > 0
            ? { success: true, data: input }
            : { success: false, errors: { x: ['required'] } }
        },
      }

      const { result } = renderHook(() =>
        useFormValidation({ values: { x: '' }, validator: custom }),
      )

      expect(result.current.isValid).toBe(false)
      act(() => result.current.markTouched('x'))
      expect(result.current.errors.x).toEqual(['required'])
    })
  })
})
