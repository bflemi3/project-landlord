import { describe, it, expect } from 'vitest'
import { assertExtracted } from './assertions'

describe('assertExtracted — leaf specs', () => {
  it('equals — passes on exact match', () => {
    expect(assertExtracted({ a: { equals: 5 } }, { a: 5 })).toEqual([])
  })
  it('equals — fails on mismatch', () => {
    const errors = assertExtracted({ a: { equals: 5 } }, { a: 6 })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('a:')
    expect(errors[0]).toContain('5')
    expect(errors[0]).toContain('6')
  })

  it('contains — case-insensitive substring match', () => {
    expect(assertExtracted({ x: { contains: 'Rua' } }, { x: 'rua Bela Cintra' })).toEqual([])
  })
  it('contains — fails when substring absent', () => {
    const errors = assertExtracted({ x: { contains: 'Rua' } }, { x: 'Avenida Paulista' })
    expect(errors).toHaveLength(1)
  })
  it('contains — fails when actual is not a string', () => {
    expect(assertExtracted({ x: { contains: 'a' } }, { x: null })).toHaveLength(1)
  })

  it('normalizedEquals — strips diacritics, case, whitespace', () => {
    expect(
      assertExtracted({ c: { normalizedEquals: 'sao paulo' } }, { c: '  São  Paulo ' }),
    ).toEqual([])
  })
  it('normalizedEquals — fails on different string', () => {
    expect(assertExtracted({ c: { normalizedEquals: 'sao paulo' } }, { c: 'Rio' })).toHaveLength(1)
  })

  it('isNull — passes on null and undefined', () => {
    expect(assertExtracted({ a: { isNull: true } }, { a: null })).toEqual([])
    expect(assertExtracted({ a: { isNull: true } }, {})).toEqual([])
  })
  it('isNull — fails on any value', () => {
    expect(assertExtracted({ a: { isNull: true } }, { a: 0 })).toHaveLength(1)
    expect(assertExtracted({ a: { isNull: true } }, { a: '' })).toHaveLength(1)
  })

  it('notNull — passes on any non-null value', () => {
    expect(assertExtracted({ a: { notNull: true } }, { a: 0 })).toEqual([])
    expect(assertExtracted({ a: { notNull: true } }, { a: '' })).toEqual([])
  })
  it('notNull — fails on null/undefined', () => {
    expect(assertExtracted({ a: { notNull: true } }, { a: null })).toHaveLength(1)
    expect(assertExtracted({ a: { notNull: true } }, {})).toHaveLength(1)
  })
})

describe('assertExtracted — nested objects', () => {
  it('recurses into nested objects', () => {
    const errors = assertExtracted(
      { rent: { amount: { equals: 500 }, currency: { equals: 'BRL' } } },
      { rent: { amount: 500, currency: 'BRL' } },
    )
    expect(errors).toEqual([])
  })
  it('reports path for nested mismatches', () => {
    const errors = assertExtracted(
      { rent: { amount: { equals: 500 } } },
      { rent: { amount: 400 } },
    )
    expect(errors[0]).toContain('rent.amount')
  })
  it('reports when a nested object is missing', () => {
    const errors = assertExtracted(
      { rent: { amount: { equals: 500 } } },
      { rent: null },
    )
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('rent')
  })
})

describe('assertExtracted — list specs', () => {
  it('length — passes on exact length', () => {
    expect(assertExtracted({ xs: { length: 2 } }, { xs: [1, 2] })).toEqual([])
  })
  it('length — fails on mismatch', () => {
    expect(assertExtracted({ xs: { length: 2 } }, { xs: [1] })).toHaveLength(1)
  })
  it('minLength — passes when actual is longer', () => {
    expect(assertExtracted({ xs: { minLength: 2 } }, { xs: [1, 2, 3] })).toEqual([])
  })
  it('minLength — fails when actual is shorter', () => {
    expect(assertExtracted({ xs: { minLength: 3 } }, { xs: [1, 2] })).toHaveLength(1)
  })

  it('items — order-independent match across all expected items', () => {
    const errors = assertExtracted(
      {
        landlords: {
          length: 2,
          items: [
            { name: { normalizedEquals: 'alex' } },
            { name: { normalizedEquals: 'daiana' } },
          ],
        },
      },
      { landlords: [{ name: 'Daiana' }, { name: 'Alex' }] },
    )
    expect(errors).toEqual([])
  })

  it('items — unique-match: two expected items cannot both claim one actual', () => {
    const errors = assertExtracted(
      {
        landlords: {
          items: [
            { name: { normalizedEquals: 'alex' } },
            { name: { normalizedEquals: 'alex' } },
          ],
        },
      },
      { landlords: [{ name: 'Alex' }] },
    )
    expect(errors.length).toBeGreaterThan(0)
  })

  it('items — reports expected item and candidate diagnostics on no match', () => {
    const errors = assertExtracted(
      {
        tenants: {
          items: [{ name: { normalizedEquals: 'brandon' } }],
        },
      },
      { tenants: [{ name: 'Alice' }] },
    )
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('tenants[0]')
  })

  it('items — permits larger actual array than items list', () => {
    const errors = assertExtracted(
      {
        expenses: {
          minLength: 2,
          items: [{ type: { equals: 'water' } }, { type: { equals: 'gas' } }],
        },
      },
      {
        expenses: [
          { type: 'electricity' },
          { type: 'water' },
          { type: 'gas' },
          { type: 'other' },
        ],
      },
    )
    expect(errors).toEqual([])
  })

  it('list — fails on non-array actual', () => {
    expect(assertExtracted({ xs: { length: 0 } }, { xs: null })).toHaveLength(1)
  })
})
