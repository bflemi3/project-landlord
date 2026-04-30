'use client'

import type { PropertyInput } from '@/data/properties/schema'
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

// ---------------------------------------------------------------------------
// Extraction-comparison hook. Sections flag fields as "auto-filled from the
// contract" via `useIsExtracted('<section>.<dot.path>')`. The hook returns
// true iff the slice value at the path strictly equals the extracted value
// AND the slice value is "present" (not null/undefined/'').
//
// Architecture:
//   • `ExtractedFieldPath` is the canonical identifier for a field. It's the
//     dot-notation path FROM the section root INTO the section's slice
//     (e.g., `property.postal_code`, `rent-dates.amount`,
//     `tenants.0.name`, `expenses.0.provider.tax_id`).
//   • `EXTRACTION_GETTERS` maps each path to its extraction-side getter (or
//     `null` for fields the extraction layer doesn't produce). The single map
//     covers every section — new sections add entries here and grow the
//     `ExtractedFieldPath` union; TypeScript enforces matching coverage.
//   • The hook walks the path into `sectionData[sectionId]` to read the
//     current value uniformly — works for flat, nested, and indexed slices.
//
// The map only encodes the part that's NON-uniform: the extraction-side
// translation (snake_case → camelCase rename, the nested `address.X` layout,
// indexing into `landlords[]` / `tenants[]` / `expenses[]`). The current-side
// is uniform path-walking and doesn't need per-field encoding.
// ---------------------------------------------------------------------------

import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

export type ExtractedFieldPath = `property.${keyof PropertyInput}`
// Future sections extend the union, e.g.:
//   | `rent-dates.${keyof RentDatesSectionValues}`
//   | `tenants.${number}.${keyof TenantInviteValues}`
//   | `expenses.${number}.${keyof ExpenseSectionValues}`

const EXTRACTION_GETTERS: Record<
  ExtractedFieldPath,
  ((extraction: ContractExtractionResult) => unknown) | null
> = {
  'property.name': null,
  'property.postal_code': (e) => e.address?.postalCode,
  'property.street': (e) => e.address?.street,
  'property.number': (e) => e.address?.number,
  'property.complement': (e) => e.address?.complement,
  'property.neighborhood': (e) => e.address?.neighborhood,
  'property.city': (e) => e.address?.city,
  'property.state': (e) => e.address?.state,
  'property.country_code': null,
  'property.property_type': (e) => e.propertyType,
}

/** Walks a dot-notation path into a possibly-nested value. Returns
 *  `undefined` as soon as any segment encounters null/undefined, so partial
 *  slices (e.g., a `tenants` array shorter than the path's index) are safe. */
function readPath(root: unknown, segments: readonly string[]): unknown {
  let cur: unknown = root
  for (const seg of segments) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

/**
 * True when the slice value at `path` matches what extraction produced and is
 * itself "present" (non-null, non-undefined, non-empty-string). Returns false
 * when extraction has no value for the field, when the values diverge, or
 * when the slice value is absent — so a freshly-typed empty field never
 * counts as auto-filled, and an extracted-but-since-edited field stops
 * counting the moment the user changes it.
 *
 * Two primitive `usePropertyCreationState` calls keep Zustand's `Object.is`
 * identity check cheap and short-circuit re-renders on unrelated store
 * changes. Combining into a single object-returning selector would allocate
 * a fresh object on every call and force a re-render on every store
 * mutation.
 */
export function useIsExtracted(path: ExtractedFieldPath): boolean {
  const [sectionId, ...fieldSegments] = path.split('.') as [SectionId, ...string[]]
  const getter = EXTRACTION_GETTERS[path]

  const current = usePropertyCreationState((s) =>
    readPath(s.sectionData[sectionId], fieldSegments),
  )
  const extracted = usePropertyCreationState((s) =>
    getter && s.extractionResult ? getter(s.extractionResult) : undefined,
  )

  if (current === null || current === undefined || current === '') return false
  return current === extracted
}
