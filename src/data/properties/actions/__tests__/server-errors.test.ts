import { describe, expect, it } from 'vitest'

import { hasAnyServerErrors } from '../server-errors'

describe('hasAnyServerErrors', () => {
  it('returns false for primitives, null, and undefined', () => {
    expect(hasAnyServerErrors(undefined)).toBe(false)
    expect(hasAnyServerErrors(null)).toBe(false)
    expect(hasAnyServerErrors('')).toBe(false)
    expect(hasAnyServerErrors(0)).toBe(false)
    expect(hasAnyServerErrors(false)).toBe(false)
  })

  it('returns false for empty arrays and empty objects', () => {
    expect(hasAnyServerErrors([])).toBe(false)
    expect(hasAnyServerErrors({})).toBe(false)
  })

  it('returns true for a non-empty leaf array (flat field-error shape)', () => {
    expect(hasAnyServerErrors({ street: ['required'] })).toBe(true)
  })

  it('returns true for a non-empty leaf array nested under a row id (row shape)', () => {
    expect(
      hasAnyServerErrors({ 'row-1': { amount_minor: ['required'] } }),
    ).toBe(true)
  })

  it('returns false when every per-row slice is empty', () => {
    expect(hasAnyServerErrors({ 'row-1': {}, 'row-2': {} })).toBe(false)
  })

  it('handles arbitrary nesting (≥3 levels deep)', () => {
    expect(
      hasAnyServerErrors({
        outer: { middle: { inner: { leaf: ['error'] } } },
      }),
    ).toBe(true)
    expect(
      hasAnyServerErrors({
        outer: { middle: { inner: { leaf: [] } } },
      }),
    ).toBe(false)
  })
})
