import { describe, expect, it } from 'vitest'

import { defaultSectionTouched, hasAnyUserSectionData } from '../section-defaults'
import { defaultSectionData } from '../extraction-seeding'
import { CHECKOUT_SECTIONS } from '../registry'

describe('defaultSectionTouched', () => {
  it('returns an entry for every section in the registry', () => {
    const touched = defaultSectionTouched()
    for (const section of CHECKOUT_SECTIONS) {
      expect(touched).toHaveProperty(section.id)
    }
  })

  it('returns each section default touched value (Set or {} per section)', () => {
    const touched = defaultSectionTouched()
    // Single-form sections (Set) and row sections ({}) both surface here —
    // the dispatcher passes through whatever the section's state.ts returns.
    expect(touched.property).toBeInstanceOf(Set)
    expect((touched.property as Set<string>).size).toBe(0)
    expect(touched.tenants).toEqual({})
    expect(touched.expenses).toEqual({})
  })
})

describe('hasAnyUserSectionData', () => {
  it('returns false for a freshly-defaulted section data shape', () => {
    expect(hasAnyUserSectionData(defaultSectionData())).toBe(false)
  })
})
