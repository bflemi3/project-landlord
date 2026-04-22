import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? undefined)),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    store.delete(key)
    return Promise.resolve()
  }),
}))

import {
  saveWizardState,
  loadWizardState,
  clearWizardState,
  hasWizardState,
  propertyCreationWizardKey,
  PROPERTY_CREATION_WIZARD_ID,
  type WizardState,
} from '../index'

beforeEach(() => {
  store.clear()
})

describe('saveWizardState + loadWizardState', () => {
  it('round-trips JSON state', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 2,
      updatedAt: '',
      data: { name: 'test', count: 42 },
    }
    await saveWizardState('test-wizard', state)
    const loaded = await loadWizardState('test-wizard')

    expect(loaded).not.toBeNull()
    expect(loaded!.version).toBe(1)
    expect(loaded!.currentStep).toBe(2)
    expect(loaded!.data).toEqual({ name: 'test', count: 42 })
  })

  it('stamps updatedAt automatically', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    const before = new Date().toISOString()
    await saveWizardState('test-wizard', state)
    const after = new Date().toISOString()

    const loaded = await loadWizardState('test-wizard')
    expect(loaded!.updatedAt >= before).toBe(true)
    expect(loaded!.updatedAt <= after).toBe(true)
  })

  it('round-trips with a Blob value', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: { file: blob },
    }
    await saveWizardState('test-wizard', state)
    const loaded = await loadWizardState('test-wizard')

    expect(loaded!.data.file).toBeInstanceOf(Blob)
    const text = await (loaded!.data.file as Blob).text()
    expect(text).toBe('hello world')
  })
})

describe('loadWizardState', () => {
  it('returns null for an unknown key', async () => {
    const result = await loadWizardState('nonexistent')
    expect(result).toBeNull()
  })

  it('returns null when stored version mismatches expected version', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await saveWizardState('test-wizard', state)
    const loaded = await loadWizardState('test-wizard', { expectedVersion: 2 })
    expect(loaded).toBeNull()
  })

  it('returns state when stored version matches expected version', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await saveWizardState('test-wizard', state)
    const loaded = await loadWizardState('test-wizard', { expectedVersion: 1 })
    expect(loaded).not.toBeNull()
    expect(loaded!.version).toBe(1)
  })
})

describe('clearWizardState', () => {
  it('removes the key so subsequent load returns null', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await saveWizardState('test-wizard', state)
    await clearWizardState('test-wizard')
    const loaded = await loadWizardState('test-wizard')
    expect(loaded).toBeNull()
  })
})

describe('hasWizardState', () => {
  it('returns true when state exists', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await saveWizardState('test-wizard', state)
    expect(await hasWizardState('test-wizard')).toBe(true)
  })

  it('returns false when state does not exist', async () => {
    expect(await hasWizardState('nonexistent')).toBe(false)
  })

  it('returns false after state is cleared', async () => {
    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await saveWizardState('test-wizard', state)
    await clearWizardState('test-wizard')
    expect(await hasWizardState('test-wizard')).toBe(false)
  })
})

describe('SSR safety', () => {
  it('saveWizardState no-ops when window is undefined', async () => {
    const original = globalThis.window
    // @ts-expect-error — deleting window for SSR simulation
    delete globalThis.window

    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }
    await expect(saveWizardState('ssr-test', state)).resolves.toBeUndefined()

    globalThis.window = original
    const loaded = await loadWizardState('ssr-test')
    expect(loaded).toBeNull()
  })

  it('loadWizardState returns null when window is undefined', async () => {
    const original = globalThis.window
    // @ts-expect-error — deleting window for SSR simulation
    delete globalThis.window

    const result = await loadWizardState('ssr-test')
    expect(result).toBeNull()

    globalThis.window = original
  })

  it('clearWizardState no-ops when window is undefined', async () => {
    const original = globalThis.window
    // @ts-expect-error — deleting window for SSR simulation
    delete globalThis.window

    await expect(clearWizardState('ssr-test')).resolves.toBeUndefined()

    globalThis.window = original
  })

  it('hasWizardState returns false when window is undefined', async () => {
    const original = globalThis.window
    // @ts-expect-error — deleting window for SSR simulation
    delete globalThis.window

    expect(await hasWizardState('ssr-test')).toBe(false)

    globalThis.window = original
  })
})

describe('concurrent saves', () => {
  it('last write wins without crashing', async () => {
    const state1: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: { value: 'first' },
    }
    const state2: WizardState = {
      version: 1,
      currentStep: 2,
      updatedAt: '',
      data: { value: 'second' },
    }

    await Promise.all([
      saveWizardState('test-wizard', state1),
      saveWizardState('test-wizard', state2),
    ])

    const loaded = await loadWizardState('test-wizard')
    expect(loaded).not.toBeNull()
    // With a synchronous Map mock, the second write always wins.
    // The point is: no crash, valid state returned.
    expect(loaded!.currentStep).toBe(2)
    expect(loaded!.data).toEqual({ value: 'second' })
  })
})

describe('error propagation', () => {
  it('loadWizardState propagates IndexedDB errors (not SSR — browser with broken IDB)', async () => {
    // Simulate idb-keyval's get throwing (e.g., IndexedDB unavailable in a
    // browser context — SecurityError in private browsing, QuotaExceededError, etc.)
    const { get } = await import('idb-keyval')
    const mockedGet = vi.mocked(get)
    mockedGet.mockRejectedValueOnce(new DOMException('IndexedDB not available', 'SecurityError'))

    await expect(loadWizardState('test-wizard')).rejects.toThrow('IndexedDB not available')
  })

  it('saveWizardState propagates IndexedDB errors in the browser', async () => {
    const { set } = await import('idb-keyval')
    const mockedSet = vi.mocked(set)
    mockedSet.mockRejectedValueOnce(new DOMException('QuotaExceededError'))

    const state: WizardState = {
      version: 1,
      currentStep: 1,
      updatedAt: '',
      data: {},
    }

    await expect(saveWizardState('test-wizard', state)).rejects.toThrow('QuotaExceededError')
  })

  it('clearWizardState propagates IndexedDB errors in the browser', async () => {
    const { del } = await import('idb-keyval')
    const mockedDel = vi.mocked(del)
    mockedDel.mockRejectedValueOnce(new DOMException('IndexedDB not available'))

    await expect(clearWizardState('test-wizard')).rejects.toThrow('IndexedDB not available')
  })

  it('hasWizardState propagates IndexedDB errors in the browser', async () => {
    const { get } = await import('idb-keyval')
    const mockedGet = vi.mocked(get)
    mockedGet.mockRejectedValueOnce(new DOMException('IndexedDB not available'))

    await expect(hasWizardState('test-wizard')).rejects.toThrow('IndexedDB not available')
  })
})

describe('propertyCreationWizardKey', () => {
  it('namespaces the draft id under the property-creation wizard', () => {
    expect(propertyCreationWizardKey('abc-123')).toBe(`${PROPERTY_CREATION_WIZARD_ID}:abc-123`)
  })

  it('keeps different drafts independent', () => {
    expect(propertyCreationWizardKey('one')).not.toBe(propertyCreationWizardKey('two'))
  })
})
