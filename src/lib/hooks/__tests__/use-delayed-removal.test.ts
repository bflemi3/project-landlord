import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useDelayedRemoval } from '../use-delayed-removal'

describe('useDelayedRemoval', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks the id as removing immediately and clears it after the duration', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 200 }))

    expect(result.current.isRemoving('a')).toBe(false)

    const commit = vi.fn()
    act(() => {
      result.current.remove('a', commit)
    })

    expect(result.current.isRemoving('a')).toBe(true)
    expect(commit).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)
  })

  it('drops the second remove when one is already in flight for the same id', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 200 }))

    const firstCommit = vi.fn()
    const secondCommit = vi.fn()
    act(() => {
      result.current.remove('a', firstCommit)
      // Second call while the first is in flight is a no-op; the second
      // commit must NOT fire — only the first wins.
      result.current.remove('a', secondCommit)
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(firstCommit).toHaveBeenCalledTimes(1)
    expect(secondCommit).not.toHaveBeenCalled()
  })

  it('allows re-removing the same id after the first removal completes', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 200 }))

    const firstCommit = vi.fn()
    const secondCommit = vi.fn()

    act(() => {
      result.current.remove('a', firstCommit)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(firstCommit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)

    // Add the same id back, remove it again — must NOT be blocked by stale
    // bookkeeping from the prior cycle.
    act(() => {
      result.current.remove('a', secondCommit)
    })
    expect(result.current.isRemoving('a')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(secondCommit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)
  })

  it('honors a custom duration', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 500 }))

    const commit = vi.fn()
    act(() => {
      result.current.remove('a', commit)
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(commit).not.toHaveBeenCalled()
    expect(result.current.isRemoving('a')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(commit).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)
  })

  it('tracks multiple ids independently', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 200 }))

    const commitA = vi.fn()
    const commitB = vi.fn()
    act(() => {
      result.current.remove('a', commitA)
    })
    act(() => {
      vi.advanceTimersByTime(50)
      result.current.remove('b', commitB)
    })

    expect(result.current.isRemoving('a')).toBe(true)
    expect(result.current.isRemoving('b')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150) // a finishes; b at 150/200
    })

    expect(commitA).toHaveBeenCalledTimes(1)
    expect(commitB).not.toHaveBeenCalled()
    expect(result.current.isRemoving('a')).toBe(false)
    expect(result.current.isRemoving('b')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(50) // b finishes
    })

    expect(commitB).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('b')).toBe(false)
  })

  it('does not run commit after the component unmounts', () => {
    const { result, unmount } = renderHook(() =>
      useDelayedRemoval({ duration: 200 }),
    )

    const commit = vi.fn()
    act(() => {
      result.current.remove('a', commit)
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(commit).not.toHaveBeenCalled()
  })

  // The mounted-ref guard exists for a race the cleanup effect can't catch:
  // a timeout fires and queues its callback in the same tick as unmount.
  // `clearTimeout` doesn't cancel an already-fired timer's queued callback,
  // so the callback runs and would otherwise call `setPendingIds` on an
  // unmounted component. With fake timers, `clearTimeout` is deterministic,
  // so we simulate the race by capturing the scheduled callback via a
  // setTimeout spy and invoking it manually after unmount.
  it('skips state update when the timeout callback fires after unmount (mountedRef guard)', () => {
    vi.useRealTimers()
    let captured: (() => void) | undefined
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementationOnce((cb) => {
        captured = cb as () => void
        // Return any value the caller can pass to clearTimeout — a number
        // matches the browser/Node return type without scheduling a real
        // timer on either runtime.
        return 0 as unknown as ReturnType<typeof setTimeout>
      })
    const clearTimeoutSpy = vi
      .spyOn(globalThis, 'clearTimeout')
      .mockImplementation(() => {})

    const { result, unmount } = renderHook(() =>
      useDelayedRemoval({ duration: 200 }),
    )

    const commit = vi.fn()
    act(() => {
      result.current.remove('a', commit)
    })
    expect(captured).toBeDefined()

    unmount()

    // Without the guard, this call would attempt setState on an unmounted
    // component. The guard short-circuits the setPendingIds call, but
    // `commit` still runs (the caller's removal intent is honored).
    expect(() => captured?.()).not.toThrow()
    expect(commit).toHaveBeenCalledTimes(1)

    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
    vi.useFakeTimers()
  })

  it('cleans up the in-flight bookkeeping when the commit throws', () => {
    const { result } = renderHook(() => useDelayedRemoval({ duration: 200 }))

    const throwingCommit = vi.fn(() => {
      throw new Error('boom')
    })

    act(() => {
      result.current.remove('a', throwingCommit)
    })

    // The throw must still propagate (the hook doesn't swallow caller errors),
    // but the in-flight bookkeeping for this id must be cleaned up regardless.
    let caught: Error | null = null
    try {
      act(() => {
        vi.advanceTimersByTime(200)
      })
    } catch (err) {
      caught = err as Error
    }
    // When `act` exits via a thrown error, React doesn't auto-flush queued
    // state updates — force a flush so the next assertion sees the cleanup
    // that the hook already performed.
    act(() => {})

    expect(caught?.message).toBe('boom')
    expect(throwingCommit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)

    // Bookkeeping cleaned ⇒ caller can retry the removal for the same id.
    // Without the cleanup, the idempotent guard would silently drop this call
    // and `retryCommit` would never fire.
    const retryCommit = vi.fn()
    act(() => {
      result.current.remove('a', retryCommit)
    })
    expect(result.current.isRemoving('a')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(retryCommit).toHaveBeenCalledTimes(1)
    expect(result.current.isRemoving('a')).toBe(false)
  })

  it('uses the default duration of 200ms when no option is provided', () => {
    const { result } = renderHook(() => useDelayedRemoval())

    const commit = vi.fn()
    act(() => {
      result.current.remove('a', commit)
    })

    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(commit).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
