'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'

import {
  createPropertyPageStore,
  type BillsFilters,
  type PropertyPageActions,
  type PropertyPageStore,
  type PropertyPageStoreValue,
  type PropertyTab,
} from './store'

const StoreContext = createContext<PropertyPageStore | null>(null)

/**
 * Per-`propertyId` store for the property page's user state (filters, tab).
 * The factory runs once per mount via `useState(() => …)` — never at module
 * scope. Mount with `key={propertyId}` so navigating between properties
 * remounts the provider and gets a store bound to the right persist key.
 */
export function PropertyPageStoreProvider({
  propertyId,
  defaultTab,
  children,
}: {
  propertyId: string
  defaultTab: PropertyTab
  children: ReactNode
}) {
  const [store] = useState(() => createPropertyPageStore({ propertyId, defaultTab }))

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

function useStoreFromContext(): PropertyPageStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('usePropertyPage* hooks must be used inside <PropertyPageStoreProvider>')
  }
  return store
}

export function usePropertyPageState<T>(selector: (state: PropertyPageStoreValue) => T): T {
  return useStore(useStoreFromContext(), selector)
}

// Actions never change after construction, so this doesn't subscribe.
export function usePropertyPageActions(): PropertyPageActions {
  return useStoreFromContext().getState().actions
}

export function useBillsFilters(): BillsFilters {
  return usePropertyPageState((state) => state.billsFilters)
}

export function useTab(): PropertyTab {
  return usePropertyPageState((state) => state.tab)
}
