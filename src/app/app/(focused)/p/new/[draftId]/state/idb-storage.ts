import { get, set, del } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * `PersistStorage` adapter backed by IndexedDB via `idb-keyval`. Used by
 * Zustand's `persist` middleware to read/write the wizard's persisted slice.
 *
 * Why a custom adapter instead of `createJSONStorage(() => …)`?
 * `createJSONStorage` runs JSON.stringify / JSON.parse, which destroys `Blob`
 * and `File` values (they serialize to `{}`). The wizard persists the user's
 * uploaded contract — a `File` — and we need it to survive a reload. IndexedDB
 * uses structured clone, which preserves `Blob` natively, so we hand the value
 * through without touching it.
 *
 * Note: structured clone preserves the underlying bytes of a `File` but may
 * lose the `File` identity on some runtimes (the value comes back as a plain
 * `Blob`). The store reconstructs a `File` in `merge` from the persisted Blob
 * + saved `contractFileName`.
 */
export function createIdbStorage<S>(): PersistStorage<S> {
  // No-op on the server — `indexedDB` is browser-only. Without this guard,
  // zustand's persist middleware tries to read from IDB during the SSR pass,
  // throws, and `onRehydrateStorage` logs the error on every render. Real
  // hydration runs again on the client where IDB exists.
  if (typeof window === 'undefined') {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  }
  return {
    getItem: async (name) => (await get<StorageValue<S>>(name)) ?? null,
    setItem: async (name, value) => {
      await set(name, value)
    },
    removeItem: async (name) => {
      await del(name)
    },
  }
}
