import type { SectionId } from './registry'

export type SectionStatus = 'upcoming' | 'completed' | 'skipped'

export const PROPERTY_CREATION_WIZARD_ID = 'property-creation'

/**
 * Bumped from 2 → 3. v3 is the first shape to ship under the Zustand `persist`
 * middleware, which owns serialization and version checks. The persisted
 * payload no longer carries the transient `hydrating` flag (the middleware
 * exposes hydration state via `useStore.persist.hasHydrated()`), and is
 * structured under the middleware's envelope rather than the bespoke
 * `WizardState<T>` envelope used by v2.
 */
export const PROPERTY_CREATION_STATE_VERSION = 3

/**
 * Canonical key formatter for a draft's persist `name`. Kept here (rather than
 * inlined into `createPropertyCreationStore`) so consumers — analytics calls,
 * future migration tooling — can refer to the same key without re-deriving it.
 */
export function propertyCreationWizardKey(draftId: string): string {
  return `${PROPERTY_CREATION_WIZARD_ID}:${draftId}`
}

// `SectionId` is re-exported here for symmetry — section status types live
// alongside the section id type so consumers can pull both in one import.
export type { SectionId }
