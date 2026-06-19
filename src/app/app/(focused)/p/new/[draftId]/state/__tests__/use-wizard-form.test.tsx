import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { z } from 'zod'

const idbStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    idbStore.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    idbStore.delete(key)
    return Promise.resolve()
  }),
}))

import { PropertyCreationStoreProvider, usePropertyCreationState } from '../store-provider'
import { useWizardForm } from '../use-wizard-form'

// Schema used to produce SafeParseResult instances we feed into the hook.
// useWizardForm doesn't care which schema produced the result — it only
// reads `.success` and `.error`. Using a tiny schema keeps the test focused.
const schema = z.object({
  street: z.string().min(1, { error: 'required' }),
  city: z.string().min(1, { error: 'required' }),
})

function makeWrapper(draftId: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PropertyCreationStoreProvider draftId={draftId}>{children}</PropertyCreationStoreProvider>
    )
  }
}

beforeEach(() => {
  idbStore.clear()
})

describe('useWizardForm — errors gating by touched', () => {
  it('returns empty errors when touched is undefined, even if values fail validation', () => {
    const wrapper = makeWrapper('draft-touched-undefined')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: undefined,
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(false)
    expect(result.current.errors).toEqual({})
  })

  it('returns empty errors when touched is an empty Set', () => {
    const wrapper = makeWrapper('draft-touched-empty')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: new Set(),
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(false)
    expect(result.current.errors).toEqual({})
  })

  it('filters errors to only touched fields', () => {
    const wrapper = makeWrapper('draft-touched-partial')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: new Set(['street']),
        }),
      { wrapper },
    )

    expect(result.current.errors).toEqual({ street: ['required'] })
  })

  it('returns empty errors when validation passes regardless of touched', () => {
    const wrapper = makeWrapper('draft-valid')
    const parseResult = schema.safeParse({ street: 'Rua A', city: 'São Paulo' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: new Set(['street', 'city']),
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('treats undefined parseResult as transient (isValid=false, no errors)', () => {
    const wrapper = makeWrapper('draft-no-parse')
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'expenses',
          parseResult: undefined,
          touched: new Set(['expense_type']),
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(false)
    expect(result.current.errors).toEqual({})
  })
})

describe('useWizardForm — isValid is independent of touched', () => {
  it('reports isValid=false when parse fails, even if nothing is touched', () => {
    const wrapper = makeWrapper('draft-isvalid-untouched')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: undefined,
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(false)
  })

  it('reports isValid=true when parse passes, even with no touched fields', () => {
    const wrapper = makeWrapper('draft-isvalid-pass')
    const parseResult = schema.safeParse({ street: 'Rua A', city: 'São Paulo' })
    const { result } = renderHook(
      () =>
        useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: undefined,
        }),
      { wrapper },
    )

    expect(result.current.isValid).toBe(true)
  })
})

describe('useWizardForm — setTouched dispatch', () => {
  it('writes to the bound sectionId, not other sections', async () => {
    const wrapper = makeWrapper('draft-set-touched')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () => ({
        form: useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: new Set(),
        }),
        sectionTouched: usePropertyCreationState((s) => s.sectionTouched),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.sectionTouched).toBeDefined()
    })

    act(() => {
      result.current.form.setTouched<ReadonlySet<string>>(() => new Set(['street']))
    })

    const propertyTouched = result.current.sectionTouched.property as
      | ReadonlySet<string>
      | undefined
    expect(propertyTouched?.has('street')).toBe(true)

    // Sister sections remain untouched.
    const tenantsTouched = result.current.sectionTouched.tenants
    expect(tenantsTouched).toEqual({})
  })

  it('updater sees the prior touched value for its own section', async () => {
    const wrapper = makeWrapper('draft-updater-prev')
    const parseResult = schema.safeParse({ street: '', city: '' })
    const { result } = renderHook(
      () => ({
        form: useWizardForm({
          sectionId: 'property',
          parseResult,
          touched: new Set(),
        }),
        sectionTouched: usePropertyCreationState((s) => s.sectionTouched),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.sectionTouched).toBeDefined()
    })

    act(() => {
      result.current.form.setTouched<ReadonlySet<string>>(() => new Set(['street']))
    })
    act(() => {
      result.current.form.setTouched<ReadonlySet<string>>((prev) => {
        const next = new Set(prev)
        next.add('city')
        return next
      })
    })

    const propertyTouched = result.current.sectionTouched.property as
      | ReadonlySet<string>
      | undefined
    expect(propertyTouched?.has('street')).toBe(true)
    expect(propertyTouched?.has('city')).toBe(true)
  })
})
