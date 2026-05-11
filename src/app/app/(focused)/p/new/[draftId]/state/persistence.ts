import type { SectionId } from './registry'

export type SectionStatus = 'upcoming' | 'completed' | 'skipped'

export const PROPERTY_CREATION_WIZARD_ID = 'property-creation'

/**
 * Bumped from 3 → 4. v4 adds the `sectionServerErrors` and `globalErrors`
 * persisted slices that carry continue / submit server-error responses across
 * refreshes and section navigation. The shape change is additive; older
 * snapshots are migrated by wiping just the new slices (`migrate` returns
 * the older payload unchanged so the persist middleware's merge phase
 * fills the new slices from `defaultState()`). Wipe-on-bump is acceptable —
 * server errors are transient by design and a stale slice from the previous
 * session shouldn't leak into a resumed wizard.
 */
export const PROPERTY_CREATION_STATE_VERSION = 4

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
