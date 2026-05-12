import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useRecentlyAdded } from '../use-recently-added'

describe('useRecentlyAdded', () => {
  it('starts with no recent id', () => {
    const { result } = renderHook(() => useRecentlyAdded())
    expect(result.current.recentId).toBeNull()
    expect(result.current.isJustAdded('any')).toBe(false)
  })

  it('marks an id as recently added', () => {
    const { result } = renderHook(() => useRecentlyAdded())

    act(() => {
      result.current.markAdded('a')
    })

    expect(result.current.recentId).toBe('a')
    expect(result.current.isJustAdded('a')).toBe(true)
    expect(result.current.isJustAdded('b')).toBe(false)
  })

  it('replaces the recent id when a new one is marked', () => {
    const { result } = renderHook(() => useRecentlyAdded())

    act(() => {
      result.current.markAdded('a')
    })
    act(() => {
      result.current.markAdded('b')
    })

    // Only the most recent id is tracked — earlier "recent" status decays as
    // soon as a new item is added.
    expect(result.current.recentId).toBe('b')
    expect(result.current.isJustAdded('a')).toBe(false)
    expect(result.current.isJustAdded('b')).toBe(true)
  })

  it('resets between mounts (re-opening a wizard section starts fresh)', () => {
    const { result: first } = renderHook(() => useRecentlyAdded())
    act(() => {
      first.current.markAdded('a')
    })
    expect(first.current.recentId).toBe('a')

    // A separate mount represents the section closing then re-opening — the
    // new instance must not inherit the prior session's "recent" id, or a
    // stale row would steal autoFocus.
    const { result: second } = renderHook(() => useRecentlyAdded())
    expect(second.current.recentId).toBeNull()
    expect(second.current.isJustAdded('a')).toBe(false)
  })
})
