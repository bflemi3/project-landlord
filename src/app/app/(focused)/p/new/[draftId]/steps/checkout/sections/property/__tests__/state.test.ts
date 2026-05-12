import { describe, expect, it } from 'vitest'

import { defaultPropertyInput, type PropertyInput } from '@/schemas/property'

import { isDefault, setAllTouched } from '../state'

describe('property/state — setAllTouched', () => {
  it('returns a Set with every property field when called with an empty Set', () => {
    const next = setAllTouched(new Set())
    expect(next.has('postal_code')).toBe(true)
    expect(next.has('street')).toBe(true)
    expect(next.has('number')).toBe(true)
    expect(next.has('city')).toBe(true)
    expect(next.has('state')).toBe(true)
    expect(next.has('country_code')).toBe(true)
    expect(next.has('property_type')).toBe(true)
  })

  it('short-circuits when prev already contains every field (returns the same ref)', () => {
    const full = setAllTouched(new Set())
    expect(setAllTouched(full)).toBe(full)
  })

  it('returns a fresh Set when prev is missing at least one field', () => {
    const partial: ReadonlySet<string> = new Set(['street'])
    const next = setAllTouched(partial)
    expect(next).not.toBe(partial)
    expect(next.has('postal_code')).toBe(true)
  })
})

describe('property/state — isDefault', () => {
  it('returns true for undefined slice', () => {
    expect(isDefault(undefined)).toBe(true)
  })

  it('returns true for the seeded default', () => {
    expect(isDefault(defaultPropertyInput())).toBe(true)
  })

  it('returns false when any field differs from the default', () => {
    const slice: PropertyInput = { ...defaultPropertyInput(), street: 'Rua A' }
    expect(isDefault(slice)).toBe(false)
  })

  it('returns false when property_type is set (default is null)', () => {
    const slice: PropertyInput = {
      ...defaultPropertyInput(),
      property_type: 'apartment',
    }
    expect(isDefault(slice)).toBe(false)
  })
})
