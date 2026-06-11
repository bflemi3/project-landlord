import { type Dispatch, type SetStateAction } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage, type PersistOptions } from 'zustand/middleware'
import { type DateRange } from 'react-day-picker'

import { PROPERTY_PAGE_STATE_VERSION, propertyPageStateKey } from './persistence'

// The full tab set across both roles. The role view passes its ordered subset
// (see property-tabs-config.ts); the default is supplied per-role at store
// construction so first visit lands on the role's home tab.
export type PropertyTab = 'revenue' | 'rent' | 'bills' | 'contract' | 'messages'

export interface BillsFilters {
  companies: string[]
  statuses: string[]
  dateRange: DateRange | undefined
}

export interface PropertyPageStateShape {
  tab: PropertyTab
  billsFilters: BillsFilters
}

export interface PropertyPageActions {
  // Dispatch/SetStateAction-shaped so the filter bar drives it like useState.
  setBillsFilters: Dispatch<SetStateAction<BillsFilters>>
  setTab: (tab: PropertyTab) => void
}

export interface PropertyPageStoreValue extends PropertyPageStateShape {
  actions: PropertyPageActions
}

// Persisted payload excludes `actions` (functions don't survive JSON).
export type PersistedPropertyPageState = PropertyPageStateShape

function defaultState(defaultTab: PropertyTab): PropertyPageStateShape {
  return {
    tab: defaultTab,
    billsFilters: { companies: [], statuses: [], dateRange: undefined },
  }
}

// localStorage is JSON, so the persisted dateRange returns as ISO strings;
// rebuild Date objects at the boundary so the store and components only ever
// see a `DateRange`. Full ISO round-trips exactly (no date-only TZ shift).
function reviveDateRange(raw: unknown): DateRange | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { from, to } = raw as { from?: unknown; to?: unknown }
  const fromDate = typeof from === 'string' ? new Date(from) : undefined
  const toDate = typeof to === 'string' ? new Date(to) : undefined
  if (!fromDate && !toDate) return undefined
  return { from: fromDate, to: toDate }
}

function buildPersistOptions(
  propertyId: string,
): PersistOptions<PropertyPageStoreValue, PersistedPropertyPageState> {
  return {
    name: propertyPageStateKey(propertyId),
    // Plain synchronous localStorage. The flash is handled in the UI: the
    // filter bar gates on `useHasHydrated()` and shows a skeleton through the
    // hydration render, so the default state is never painted.
    storage: createJSONStorage(() => localStorage),
    version: PROPERTY_PAGE_STATE_VERSION,
    partialize: (state) => ({ tab: state.tab, billsFilters: state.billsFilters }),
    merge: (persistedUnknown, current) => {
      if (persistedUnknown == null) return current
      const persisted = persistedUnknown as Partial<PersistedPropertyPageState>
      return {
        ...current,
        tab: persisted.tab ?? current.tab,
        billsFilters: {
          companies: persisted.billsFilters?.companies ?? current.billsFilters.companies,
          statuses: persisted.billsFilters?.statuses ?? current.billsFilters.statuses,
          dateRange: reviveDateRange(persisted.billsFilters?.dateRange),
        },
      }
    },
  }
}

export function createPropertyPageStore({
  propertyId,
  defaultTab,
}: {
  propertyId: string
  defaultTab: PropertyTab
}) {
  return create<PropertyPageStoreValue>()(
    persist(
      (set, get) => ({
        ...defaultState(defaultTab),
        actions: {
          setBillsFilters: (action) => {
            const prev = get().billsFilters
            const next = typeof action === 'function' ? action(prev) : action
            set({ billsFilters: next })
          },
          setTab: (tab) => set({ tab }),
        },
      }),
      buildPersistOptions(propertyId),
    ),
  )
}

export type PropertyPageStore = ReturnType<typeof createPropertyPageStore>
