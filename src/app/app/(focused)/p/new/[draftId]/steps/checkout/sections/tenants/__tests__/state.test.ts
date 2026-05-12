import { describe, expect, it } from 'vitest'

import { defaultTenantRow, type TenantRow } from '../schemas'
import { isDefault, setAllTouched } from '../state'

describe('tenants/state — setAllTouched', () => {
  it('returns prev when sectionData is empty (no rows to mark)', () => {
    const prev = {}
    expect(setAllTouched(prev, [])).toBe(prev)
  })

  it('returns prev when sectionData is undefined', () => {
    const prev = {}
    expect(setAllTouched(prev, undefined)).toBe(prev)
  })

  it('builds a Record<rowId, Set<field>> for each row', () => {
    const row: TenantRow = defaultTenantRow()
    const next = setAllTouched({}, [row])
    expect(next[row.id]).toBeInstanceOf(Set)
    expect(next[row.id]?.has('name')).toBe(true)
    expect(next[row.id]?.has('email')).toBe(true)
    expect(next[row.id]?.has('taxId')).toBe(true)
    expect(next[row.id]?.has('inviteNow')).toBe(true)
  })

  it('short-circuits when every row already has every field touched (returns same ref)', () => {
    const row: TenantRow = defaultTenantRow()
    const populated = setAllTouched({}, [row])
    expect(setAllTouched(populated, [row])).toBe(populated)
  })

  it('preserves entries for rows not in sectionData (does not delete stale keys)', () => {
    // The dispatcher only sets new entries; it never prunes. Stale rowIds
    // (a row that was removed) stick around until something else cleans up.
    const stale: ReturnType<typeof setAllTouched> = {
      'gone-row-id': new Set(['name']),
    }
    const row: TenantRow = defaultTenantRow()
    const next = setAllTouched(stale, [row])
    expect(next['gone-row-id']).toBe(stale['gone-row-id'])
    expect(next[row.id]).toBeInstanceOf(Set)
  })
})

describe('tenants/state — isDefault', () => {
  it('returns true for undefined slice', () => {
    expect(isDefault(undefined)).toBe(true)
  })

  it('returns true for an empty list', () => {
    expect(isDefault([])).toBe(true)
  })

  it('returns false when at least one row is present', () => {
    expect(isDefault([defaultTenantRow()])).toBe(false)
  })
})
