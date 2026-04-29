'use client'

import {
  CHECKOUT_SECTIONS,
  getRequiredSectionIds,
  type SectionId,
} from './registry'
import type { SectionStatus } from './persistence'
import { usePropertyCreationState } from './store-provider'

// ---------------------------------------------------------------------------
// Re-export the public hook surface from the Provider module so existing
// section-component imports keep working (`import { usePropertyCreationState,
// usePropertyCreationActions } from '.../state/use-property-creation'`).
// ---------------------------------------------------------------------------

export {
  PropertyCreationStoreProvider,
  usePropertyCreationState,
  usePropertyCreationActions,
  usePropertyCreationHasHydrated,
} from './store-provider'

export type {
  PropertyCreationActions,
  PropertyCreationStateShape,
  PropertyCreationStoreValue,
  PropertyCreationStore,
} from './store'

// ---------------------------------------------------------------------------
// Per-section selectors. Each section component (property, rent-dates, etc.)
// reads its own slice of the store through these instead of writing the same
// inline selector six times. Each returns a primitive so Zustand's identity
// equality short-circuits the re-render when the value hasn't changed.
// ---------------------------------------------------------------------------

/** This section's status — `'upcoming' | 'completed' | 'skipped'`. */
export function useSectionStatus(id: SectionId): SectionStatus {
  return usePropertyCreationState((s) => s.sectionStates[id])
}

/** True when this section is currently expanded in the accordion. */
export function useIsSectionActive(id: SectionId): boolean {
  return usePropertyCreationState((s) => s.activeSectionId === id)
}

/**
 * True when this section is the immediate next upcoming section. Drives the
 * "Up next" status indicator and (in the locked-upcoming branch) decides
 * whether the section header is tappable.
 */
export function useIsSectionUpNext(id: SectionId): boolean {
  return usePropertyCreationState((s) => {
    const upNextId = CHECKOUT_SECTIONS.find(
      (x) => s.sectionStates[x.id] === 'upcoming',
    )?.id
    return upNextId === id
  })
}

/**
 * True when this section is required for the current entry path. Before the
 * path is committed (Step 1 not yet finished) every section is treated as
 * required so Skip cannot fire prematurely.
 */
export function useIsSectionRequired(id: SectionId): boolean {
  const path = usePropertyCreationState((s) => s.path)
  if (!path) return true
  return getRequiredSectionIds(path).includes(id)
}
