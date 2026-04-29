# Property Section (Checkout Accordion) — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Replace the placeholder body of the Property section in the property-creation checkout accordion with a real form: name, CEP-driven address fields, and a property-type selector. Pre-fill from contract extraction, persist user input to wizard `sectionData` on Continue / Back, gate Continue with live Zod validation, and run the existing server-side duplicate-address check on Continue.

**Deliverable:** Going through the property-creation wizard (contract path or no-contract path) and reaching Step 2, the landlord sees the Property section open with extracted address + property type pre-filled (or empty in no-contract path). Each extracted field shows a small "Auto-filled from your contract" caption that disappears on edit. Continue is disabled until required fields are valid; tapping Continue runs the duplicate-address check, surfaces a duplicate via the existing toast pattern (or persists the values to `sectionData.property` and advances to the next section). Back persists the current draft values, then collapses. Reload of the wizard restores the entered values.

**Spec:** `docs/superpowers/specs/2026-04-22-property-checkout-shell-design.md` — primarily the "Property details" subsection of "Section-Specific UX Notes," plus the relevant cross-cutting rules in "Section States," "Navigation Behavior," and "State Persistence." Parent product spec: `docs/superpowers/specs/2026-04-16-property-creation-design.md`.

**Depends on:**
- Checkout shell scaffold (`docs/superpowers/plans/2026-04-23-property-checkout-shell-scaffold.md`) — `<Section>` primitive, `useSectionController`, `setSectionData`, `extractionResult` in store, summary panel, etc. All shipped.
- Existing `CepField` (`src/components/forms/cep-field.tsx`).
- Existing `validateProperty` server action (`src/data/properties/actions/validate-property.ts`).
- `property_type` Postgres enum (`supabase/migrations/20260417120000_property_type_enum.sql`).

**Blocks:** The future `createProperty` server-action plan (which will read `sectionData.property`, write the new `property_type` column, and finalize property creation).

**Code review policy:** A single comprehensive code review at the end of the plan (Task 7), not per-task.

**Do not commit during execution.** All work stays uncommitted until the user has tested and approved the section in a browser.

**Architectural rule (do not violate):** The wizard store is the single source of truth. Section components ask the store for the data their slice holds and render it — they never read upstream sources directly. Specifically, **section components do not read `extractionResult`** and do not import from `@/lib/contract-extraction/*`. Translating `ContractExtractionResult` into a section's value shape is the responsibility of the *store* (in `commitContractOutput` and in `hydrate`), not the component. The only place a section "compares against extraction" is via the `useIsExtracted` hook from Task 2, which encapsulates the comparison behind a `'section.field'` path so the call site stays free of extraction details. This boundary keeps the mapping in one place, makes persistence structural rather than accidental, and lets each section component remain a dumb consumer of its slice.

**Execution mode: inline for every task.** Subagents kept producing implementation-level drift (boundary violations, derived-type duplication, off-scale spacing, missed `useCallback`s) that costs more to review and redo than executing inline. The controller does the work directly with the user reviewing diffs at task boundaries.

Between Tasks 1 and 2, sanity-check the store-as-source-of-truth wiring before moving on — that's the single decision most likely to drift, and catching it after Task 2 is harder.

---

## Codebase Context

### What's already in place (read these before changing anything)

- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/section.tsx` — The `Section` compound primitive (`Section.Header`, `.Icon`, `.HeaderContent`, `.Title`, `.Subtitle`, `.Status`, `.Summary`, `.Body`, `.Actions`). `Section.Actions` currently exposes `onBack`, `onContinue`, `onSkip`, `showSkip`, `continueLabel`, `backLabel`, `skipLabel`. **It does NOT accept a `continueDisabled` prop today** — Task 3 extends it.
- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/use-section-controller.ts` — Provides `handleContinue` (advances state), `handleSkip`, `handleBack`, plus `status` / `isActive` / `isUpNext` / `isRequired`. The Property section is required in both paths, so `isRequired` is always `true` and Skip is never shown.
- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx` — Current placeholder section; this is the file Task 1 rewrites.
- `src/app/app/(focused)/p/new/[draftId]/state/store.ts` — Wizard Zustand store. `setSectionData<T>(id, next)` writes per-section data via a value or updater. `extractionResult` and `path` live at the top level of the store; persist to IndexedDB. `commitContractOutput(next)` is the action Step 1 calls when extraction completes — it currently sets `extractionResult` and `path`, and Task 1 extends it to also fold extraction-derived values into `sectionData` via `mergeExtractionIntoSectionData(prev, extraction)` so section components never have to read extraction themselves. Task 1 also: (a) makes `defaultState()` eagerly initialize `sectionData` to `defaultSectionData()` so every section's slice is non-undefined from the moment the store exists — components read their slice without `??` fallbacks; (b) adds a small `updateSectionData<T>(id, partial: Partial<T>)` action that does a shallow partial merge so per-field `onChange` handlers don't need to re-spread the slice; (c) extends `hydrate(wizardKey)` with a backfill step that runs `mergeExtractionIntoSectionData` when persisted state has `path === 'contract'` and `extractionResult !== null` but a missing slice.
- `src/app/app/(focused)/p/new/[draftId]/state/persistence.ts` — Defines `PropertyCreationData` with `sectionData: Partial<Record<SectionId, unknown>>`. The `unknown` per-section is a placeholder; this plan establishes the concrete shape for the `property` slice. **Do not bump `PROPERTY_CREATION_STATE_VERSION`** — adding a key inside `sectionData` is additive and the existing version covers it (the `Partial` typing tolerates absent keys for older state).
- `src/app/app/(focused)/p/new/[draftId]/state/use-property-creation.ts` — Selector / actions hooks. `usePropertyCreationState` for reads, `usePropertyCreationActions` for the action bag.
- `src/components/forms/cep-field.tsx` — `CepField` is a self-contained CEP input with ViaCEP lookup. Calls `onAddressFound({ street, neighborhood, city, state })` on lookup success — **the payload does NOT include the postal code itself**. The input is currently uncontrolled (uses `defaultValue` only). For the accordion section's store-as-source-of-truth model we need the typed CEP to flow into `sectionData` on every keystroke (so partial typing is preserved across WizardShell Back, reload, and so Zod can validate it). Task 1 extends `CepField` to support a controlled mode while keeping the existing uncontrolled API for backward compatibility — the edit modal (`PropertyInfoActions`) keeps working unchanged.
- `src/components/forms/property-form.tsx` — The legacy `PropertyForm` compound used by the property edit modal. **Not reused in this plan.** Its root wraps a `<form>` element with its own validation/submit flow that conflicts with the accordion's external `Section.Actions` Continue button. Task 1 composes the form fields fresh inside `sections/property.tsx`, mirroring `PropertyForm.Content`'s grid structure but with controlled inputs and Zod-driven validation. `PropertyForm` itself is left untouched so the existing edit modal continues to work.
- `src/data/properties/actions/validate-property.ts` — Server action. `validateProperty(fields, excludePropertyId?)` runs name/address validation and the duplicate-address check. Returns `{ valid: true, fields }` or `{ valid: false, errors?, existingPropertyId? }`. Reuse as-is. The `errors` object is keyed by field name, returns i18n keys (e.g., `'tooLong'`, `'duplicateAddress'`); the section maps these to translated strings.
- `src/lib/contract-extraction/types.ts` — `ContractExtractionResult.address` is `ContractAddress | null` with `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `postalCode`, `country` (each `string | null`). `propertyType` is `PropertyType | null`. `PropertyType = Database['public']['Enums']['property_type']` — `'apartment' | 'house' | 'commercial' | 'other'`.
- `messages/en.json`, `pt-BR.json`, `es.json` — All address field labels exist under `properties.*` (`propertyName`, `street`, `streetPlaceholder`, `number`, `complement`, `neighborhood`, `city`, `cityPlaceholder`, `state`, `statePlaceholder`, `postalCode`, etc.). Add new keys for property-type label/options and the "auto-filled" caption under `propertyCreation.checkout.property.*` and `properties.propertyType*`.

### Patterns to follow

- **Section composition** mirrors `sections/cpf.tsx` and `sections/property.tsx` (current placeholder): top-level `'use client'`, `useTranslations`, `useCheckoutContext`, `useSectionController`, then `<Section>` with header / body / actions. Don't break this structure.
- **Hook ordering** per `frontend-patterns`: refs → context → router → state → derived → queries → effects → callbacks → render helpers → return.
- **Form fields** use the existing UI primitives — `Input`, `Label`, `Select` (`SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) — never custom inputs.
- **Address grid** in PropertyForm.Content (file `property-form.tsx`) is the closest visual reference: a 3-col grid where street takes 2 cols + number takes 1, then complement on its own row, neighborhood on its own row, then a 3-col grid where city takes 2 + state takes 1. The accordion section reuses this structure but adapts spacing for desktop width (Task 5).
- **Schema co-location** — Zod schema lives in `src/data/properties/property-section-schema.ts`. Co-locating it under `src/data/properties/` (not in the section folder) lets the future `createProperty` server action import the same schema as authoritative validation, satisfying the spec's "one Zod schema per section, shared between client and server."
- **`useTranslations` namespacing** — Sections use `propertyCreation.checkout` for shell-level keys and reuse the global `properties.*` namespace for field labels. The new "auto-filled" caption goes under `propertyCreation.checkout.property.autoFilled` (translated). The new property-type select keys go under `properties.propertyTypeLabel`, `properties.propertyTypePlaceholder`, `properties.propertyTypes.apartment`, etc.
- **Migrations** must follow `.claude/rules/database-migrations.md`: additive, non-destructive, no rename. The `property_type` column is added nullable with no default; no backfill is required because no code reads the column until the future `createProperty` server-action plan ships, and existing rows are untouched.

### Current state facts

- `properties` table does NOT yet have a `property_type` column. The enum exists (Task 6 adds the column).
- Wizard state version is `2`. Adding the `property` key inside `sectionData` does not require a version bump — `sectionData: Partial<Record<SectionId, unknown>>` tolerates missing entries. With Task 1's eager init in `defaultState()`, fresh stores start with `sectionData.property` populated by `defaultPropertySectionValues`. Persisted state from before this change has `sectionData: {}`; on hydrate it gets merged over `defaultSectionData()` (so missing slices fall through to defaults) and, when `path === 'contract'` with a non-null `extractionResult`, the property slice is backfilled via `mergeExtractionIntoSectionData`.
- `validateProperty`'s `errors.general` for duplicate is the string `'duplicateAddress'`, alongside `existingPropertyId`. The toast pattern with the "View existing property" action is already in use in `property-form.tsx`'s `handleSubmit` — **mirror that pattern in the section's Continue handler** for consistency, but anchor the error inline to the postal-code/number/complement field group as well per the spec ("If an error ties to a specific field… the error should appear inline near that field"). Inline + toast is acceptable; the toast carries the cross-link, the inline error keeps the field anchor.

---

## File Structure

| File | Purpose | Created or modified |
|---|---|---|
| `src/app/app/(focused)/p/new/[draftId]/state/extraction-seeding.ts` | New. **Single** seeding entry point covering all sections that derive initial values from extraction. Exports: `defaultPropertySectionValues`, `defaultSectionData()` (returns the blank shape for *all* sections — Task 1 populates only `property`; future plans append `rent-dates`, `tenants`, `expenses`), and `mergeExtractionIntoSectionData(prev, extraction)` (folds extraction-derived values into the previous `sectionData` shape; future plans append per-section folds). Reuses `PropertyType` from `@/lib/contract-extraction/types` rather than re-declaring an enum literal. | Created |
| `src/app/app/(focused)/p/new/[draftId]/state/__tests__/extraction-seeding.test.ts` | New. Unit tests for `mergeExtractionIntoSectionData` (Property section coverage) and `defaultSectionData()`. | Created |
| `src/app/app/(focused)/p/new/[draftId]/state/store.ts` | Modify `defaultState()` to eagerly initialize `sectionData` via `defaultSectionData()` so section slices are never `undefined`. Modify `commitContractOutput` to call `mergeExtractionIntoSectionData` when committing a non-null extraction on the contract path. Modify `hydrate` to (a) merge any persisted `sectionData` over `defaultSectionData()` so missing slices fall to defaults, and (b) backfill via `mergeExtractionIntoSectionData` when `path === 'contract'`, `extractionResult !== null`, and the property slice was missing in persisted state. Add a new `updateSectionData<T>(id, partial: Partial<T>)` action — shallow partial merge — so `onChange` handlers don't re-spread the whole slice. | Modified |
| `src/data/properties/property-section-schema.ts` | New. Zod schema (`propertySectionSchema`) + inferred type (`PropertySectionValues`) + `defaultPropertySectionValues()` helper. After Task 2 lands, this file is the canonical home for the property slice's shape; `extraction-seeding.ts` re-imports both the type and the defaults from here. | Created |
| `src/data/properties/__tests__/property-section-schema.test.ts` | New. Vitest unit tests for the Zod schema. | Created |
| `src/app/app/(focused)/p/new/[draftId]/state/use-property-creation.ts` | Add a single global `useIsExtracted(path: 'section.field')` hook with an internal mapping table that translates the logical path to the store reads (current value from `sectionData`, extracted value from `extractionResult`). The hook contains the comparison directly (no separate `isAutoFilled` helper). The Property section's entries are added in this plan; future sections will append their own rows. | Modified |
| `src/app/app/(focused)/p/new/[draftId]/state/__tests__/use-property-creation.test.tsx` | Extend with `useIsExtracted` cases via `renderHook` + fresh-store pattern. | Modified |
| `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx` | Replace placeholder body with the real form. The component reads `sectionData.property` only — it never reads `extractionResult` and never imports from `@/lib/contract-extraction/*`. Adds Zod-derived `canContinue`, Continue handler with server-side duplicate check, radio-card property-type selector, auto-filled-field indicators (via `useIsExtracted`), responsive layout. | Modified |
| `src/app/app/(focused)/p/new/[draftId]/steps/checkout/section.tsx` | Extend `Section.Actions` to accept `continueDisabled?: boolean` and `continueLoading?: boolean`. | Modified |
| `messages/en.json`, `messages/pt-BR.json`, `messages/es.json` | Add property-type labels, option labels, and the "auto-filled" caption. | Modified |
| `supabase/migrations/20260427120000_properties_property_type_column.sql` | New. Adds `property_type property_type` column to `properties` (nullable, no default). | Created |
| `src/lib/types/database.ts` | Regenerated from local Supabase after the migration applies. | Modified (regenerated) |
| `src/components/forms/cep-field.tsx` | Add optional `value` + `onValueChange` props for controlled mode. Existing `defaultValue` behavior preserved when the new props are absent (edit modal stays uncontrolled). | Modified |

---

## Tasks

### Task 1 — Replace Property section placeholder with the real form scaffold (store-as-source-of-truth)

**What & why:** Render the actual form fields inside the Property section's body. Make the wizard store the single source of truth for values: the component reads `sectionData.property` and renders it. Initial seeding from a contract extraction happens *inside the store* — when Step 1 commits the extraction, the store action populates `sectionData.property` from the extraction in the same `set()` call. The component never reads `extractionResult` and never imports from `@/lib/contract-extraction/*`. Establishes the deliverable's visual surface with no validation yet (Task 3) and no server-side check (Task 4).

This boundary is the architectural rule called out at the top of the plan. Violating it (component reaching for extraction, doing the snake_case rename in a `useMemo`, "first edit captures display values" workaround) silently splits truth into two places and makes every future section repeat the mistake. Don't do that.

**Where:**
- `src/app/app/(focused)/p/new/[draftId]/state/extraction-seeding.ts` — new file. The pure seeding helper.
- `src/app/app/(focused)/p/new/[draftId]/state/__tests__/extraction-seeding.test.ts` — new file. Unit tests.
- `src/app/app/(focused)/p/new/[draftId]/state/store.ts` — modify `commitContractOutput` and `hydrate` to call the seeding helper.
- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx` — rewrite the body of `PropertySection`. Keep the existing exports (`PropertySection`, `PropertySectionSkeleton`, `PropertySummaryRow`). The `useIsExtracted` hook is added in Task 2; this task does not yet consume it.
- `src/components/forms/cep-field.tsx` — add controlled-mode props (see CepField extension below).

**How:**

#### Seeding helper — `state/extraction-seeding.ts` (one merge function for all sections)

A single, total merge function that folds extraction-derived values into the section-data shape. There is one merge function for the entire `sectionData`, not one per section. Future plans extend the body when new sections gain extractable fields.

```ts
import type {
  ContractExtractionResult,
  PropertyType,
} from '@/lib/contract-extraction/types'
import type { SectionId } from './registry'

export type SectionData = Partial<Record<SectionId, unknown>>

export interface PropertySectionInitialValues {
  name: string
  postal_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country_code: string
  property_type: PropertyType | null
}

export const defaultPropertySectionValues: PropertySectionInitialValues = {
  name: '',
  postal_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country_code: 'BR',
  property_type: null,
}

/** Default shape for `sectionData`. Keys are section ids; values are each
 *  section's blank-state object. Future sections append their entries here. */
export function defaultSectionData(): SectionData {
  return {
    property: defaultPropertySectionValues,
  }
}

/** Folds extraction-derived values into the previous `sectionData`. Sections
 *  without extractable fields are passed through unchanged. The store calls
 *  this from `commitContractOutput` and from `hydrate`'s backfill path —
 *  section components never invoke it (and never read extraction). */
export function mergeExtractionIntoSectionData(
  prev: SectionData,
  extraction: ContractExtractionResult,
): SectionData {
  const a = extraction.address
  const property: PropertySectionInitialValues = {
    name: '',
    postal_code: a?.postalCode ?? '',
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    neighborhood: a?.neighborhood ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
    country_code: 'BR',
    property_type: extraction.propertyType,
  }
  return { ...prev, property }
}
```

Notes on type reuse: `PropertyType` is imported from `@/lib/contract-extraction/types` (not redeclared as a local enum literal). The seeding file is the only Task-1 module that imports from `@/lib/contract-extraction/*` — that boundary is fine because the seeding file is *the* translator; the section component does not import this type from contract-extraction either, since the slice's interface (`PropertySectionInitialValues`) carries `property_type: PropertyType | null` for it.

The `PropertySectionInitialValues` interface is provisional — Task 2 introduces the canonical Zod-inferred `PropertySectionValues` (under `src/data/properties/property-section-schema.ts`) and the seeding helper swaps its return type to the inferred type. Field shapes match exactly so the transition is mechanical.

Tests in `__tests__/extraction-seeding.test.ts`:
- `mergeExtractionIntoSectionData(prev, extraction)` with a full address populates every property field correctly, with `postalCode` → `postal_code` rename.
- Partial-null extraction address → unset fields become `''`.
- `address: null` (the whole object) → all address fields become `''`, `country_code: 'BR'`, `name: ''`.
- `propertyType: null` → `property_type: null`.
- `propertyType: 'apartment'` → `property_type: 'apartment'`.
- `prev` includes other section keys (e.g., `'rent-dates': { foo: 'bar' }`) → those keys are preserved in the result unchanged.
- `defaultSectionData()` returns an object with `property === defaultPropertySectionValues` (referential or deep equal — pick one and stick to it; deep equal is more flexible).

#### Store changes — `state/store.ts`

Three structural changes plus one new action.

1. **Eager-init `sectionData` in `defaultState()`.** The current `sectionData: {}` becomes `sectionData: defaultSectionData()` (imported from `extraction-seeding.ts`). Result: a fresh store starts with `sectionData.property` populated by `defaultPropertySectionValues`. Section components can read their slice with a type cast and never need a `??` fallback.

2. **`commitContractOutput`** calls `mergeExtractionIntoSectionData` instead of the per-property seeder:

   ```ts
   commitContractOutput: (nextOrUpdater) => {
     const state = get()
     const prev = {
       extractionResult: state.extractionResult,
       path: state.path ?? ('contract' as CheckoutPath),
     }
     const next =
       typeof nextOrUpdater === 'function'
         ? (nextOrUpdater as (p: typeof prev) => typeof prev)(prev)
         : nextOrUpdater
     const sectionData =
       next.extractionResult !== null && next.path === 'contract'
         ? mergeExtractionIntoSectionData(state.sectionData, next.extractionResult)
         : state.sectionData
     set({
       extractionResult: next.extractionResult,
       path: next.path,
       sectionData,
     })
   },
   ```

   Decision: a fresh extraction commit on the contract path **overwrites** the property slice via the merge function. Re-extract isn't an in-scope flow; if it lands later, that UI can decide overwrite-vs-merge semantics.

3. **`hydrate`** uses the same merge function for backfill, and merges persisted `sectionData` over `defaultSectionData()` so any missing keys fall to defaults:

   ```ts
   const baseSectionData: SectionData = { ...defaultSectionData(), ...(data.sectionData ?? {}) }
   const seededSectionData =
     data.path === 'contract' &&
     data.extractionResult !== null &&
     data.sectionData?.property === undefined
       ? mergeExtractionIntoSectionData(baseSectionData, data.extractionResult)
       : baseSectionData
   store.setState({ /* …other fields… */ sectionData: seededSectionData })
   ```

   Backfill condition: only when persisted state had no property slice AND extraction was committed. This preserves user edits across reloads (if persisted slice exists, it wins over re-seeding from extraction).

4. **New action `updateSectionData<T>(id, partial: Partial<T>)`**, sibling of the existing `setSectionData`:

   ```ts
   updateSectionData: <T>(id: SectionId, partial: Partial<T>) => {
     const state = get()
     const prev = state.sectionData[id] as T | undefined
     set({
       sectionData: {
         ...state.sectionData,
         [id]: { ...(prev ?? {}), ...partial } as unknown,
       },
     })
   },
   ```

   `setSectionData` stays for the rare callsite that wants a full updater closure. Section components use `updateSectionData` for `onChange` handlers — terse, no spread at the callsite, no per-section `setField` wrappers.

5. **Do NOT bump `PROPERTY_CREATION_STATE_VERSION`.** Eager-init is internal; the persisted shape is unchanged at the wire level. Hydration's `defaultSectionData()` merge handles older payloads.

#### Component — `sections/property.tsx`

- **Imports.** No `ContractExtractionResult`, no extraction selector, no `deriveFromExtraction`, no `setField` helper. Imports the slice interface and the dynamic-placeholder helper:

  ```ts
  import { useCallback, useMemo } from 'react'
  import { useTranslations } from 'next-intl'
  import { Building2 } from 'lucide-react'

  import { CepField } from '@/components/forms/cep-field'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  } from '@/components/ui/select'
  import { getAddressProvider } from '@/lib/address/provider'
  import { formatPropertyName } from '@/lib/address/format-property-name'
  import type { AddressLookupResult } from '@/lib/address/types'

  import type { SectionId } from '../../../state/registry'
  import type { PropertySectionInitialValues } from '../../../state/extraction-seeding'
  import {
    usePropertyCreationActions,
    usePropertyCreationState,
  } from '../../../state/use-property-creation'
  ```

- **Store wiring.** One slice read and one action read. Because eager-init guarantees the slice is populated, the cast carries no `| undefined`:

  ```ts
  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertySectionInitialValues,
  )
  const { updateSectionData } = usePropertyCreationActions()
  ```

  No `??` fallback. No `useMemo` that resolves a "displayed shape." No `setField` wrapper.

- **Memoized derivations.** The dynamic placeholder is memoized — recomputed only when the relevant address parts or the i18n function change:

  ```ts
  const namePlaceholder = useMemo(() => {
    const derived = formatPropertyName({
      street: values.street,
      number: values.number,
      complement: values.complement,
      countryCode: values.country_code,
    })
    return derived.length > 0 ? derived : tProperties('propertyNamePlaceholder')
  }, [values.street, values.number, values.complement, values.country_code, tProperties])
  ```

- **Memoized callbacks for `CepField` (memoized child).** `CepField` is wrapped in `React.memo`; passing inline arrow props would defeat the memoization. Both `onValueChange` and `onAddressFound` are wrapped in `useCallback` whose only dependency is `updateSectionData` (stable per the existing actions-bag contract):

  ```ts
  const handlePostalCodeChange = useCallback(
    (formatted: string) =>
      updateSectionData<PropertySectionInitialValues>('property', { postal_code: formatted }),
    [updateSectionData],
  )

  const handleAddressFound = useCallback((result: AddressLookupResult) => {
    const partial: Partial<PropertySectionInitialValues> = {}
    if (result.street) partial.street = result.street
    if (result.neighborhood) partial.neighborhood = result.neighborhood
    if (result.city) partial.city = result.city
    if (result.state) partial.state = result.state
    if (Object.keys(partial).length > 0) {
      updateSectionData<PropertySectionInitialValues>('property', partial)
    }
  }, [updateSectionData])
  ```

  The address-found handler intentionally only writes fields the lookup actually produced, so a partial CEP lookup never wipes existing values with nullish ones. Callbacks for non-memoized `<Input>` / `<Select>` siblings can be inline arrows — those children don't benefit from memoized props.

- **Layout.** Single column on mobile (Task 5 introduces desktop pairing). Use `gap-6` (24 px — the design-system "section" rhythm) between groups, **not** `gap-5` (20 px) — the design-system skill explicitly bans `gap-5` as off-scale. Wrapper: `<div className="flex flex-col gap-6">`.

- **Form field order** (top to bottom — property type leads to set the user's mental model before address details):
  1. **Property type** — temporary plain `<Select>` for Task 1 (apartment / house / commercial / other). Task 5 swaps it for a radio-card group.
  2. **Property name** — optional `<Input>` with the memoized dynamic placeholder above. Hint `properties.propertyNameHint` rendered beneath as `text-muted-foreground text-sm`.
  3. **CEP** — `CepField` in controlled mode (see CepField extension below). Pass `value={values.postal_code}`, `onValueChange={handlePostalCodeChange}`, `onAddressFound={handleAddressFound}`.
  4. **Street + Number** — controlled `<Input>`s. Inline arrow `onChange` calling `updateSectionData<PropertySectionInitialValues>('property', { street: e.target.value })`.
  5. **Complement** — controlled `<Input>`.
  6. **Neighborhood** — controlled `<Input>`.
  7. **City + State** — controlled `<Input>` + `<Select>` over `getAddressProvider('BR').states`.

- **`PropertyForm.Name` reuse?** Not for Task 1. `PropertyFormName` (in `src/components/forms/property-form.tsx`, lines 184–204) reads `initialValues` and `errors` from `PropertyFormContext`, which is the legacy edit modal's form-submit context. Lifting it cleanly would require either dragging `PropertyForm` into the wizard (its `<form>` submit conflicts with `Section.Actions`) or refactoring `PropertyFormName` to a context-free presentational component (churn for one field on a form that the wizard will eventually retire). The wizard's name field is a few lines; build it directly in `sections/property.tsx`.

- **CepField extension (controlled mode).** Modify `src/components/forms/cep-field.tsx` to accept two new optional props — `value?: string` and `onValueChange?: (formatted: string) => void`. When both are present, the inner `<Input>` is controlled (`value={value}`, no `defaultValue`). When absent, behavior matches today. The existing `handleChange` continues to format raw digits via `addressProvider.formatPostalCode`; in controlled mode the formatted string is passed to `onValueChange` so the parent's store update reflects the formatted value on the next render. The CEP lookup (debounced ViaCEP fetch + `onAddressFound`) is unchanged. The existing uncontrolled callsite in `PropertyInfoActions` keeps working byte-identically.

- **Wire `useSectionController`** with `isFirst: true` (preserve from current placeholder). `ctrl.handleBack` is `undefined` — `Section.Actions` skips Back, which is correct per the spec.

- **Continue button** in `Section.Actions` calls `ctrl.handleContinue` for now (Task 4 wraps it with the duplicate-check). `showSkip={false}` always.

- **Subtitle** copy stays as today.

**Verify:**
1. Unit tests for `mergeExtractionIntoSectionData` and `defaultSectionData` pass.
2. Existing wizard-state tests still pass — including the persistence and use-property-creation suites; eager-init must not break the round-trip (`saveWizardState` followed by `loadWizardState`).
3. `pnpm exec tsc --noEmit` is clean.
4. `pnpm lint` is clean for files this task modifies.
5. **Boundary check:** `grep -n "extractionResult\|contract-extraction" src/app/app/\(focused\)/p/new/\[draftId\]/steps/checkout/sections/property.tsx` returns no matches. The section component must contain neither identifier.
6. **No `setField` helper** in the section component (`grep -n "function setField\|const setField" sections/property.tsx` returns no matches). `onChange` handlers call `updateSectionData` directly.
7. **No `gap-5` anywhere in the section file** (`grep -n "gap-5" sections/property.tsx` returns no matches).
8. **Browser smoke (deferred to Task 7).** This task does not require a manual browser pass; Task 7 covers the end-to-end paths.

**Check:** `frontend-patterns` (Zustand selectors, hook ordering, controlled inputs, `useCallback` on memoized-child props, `useMemo` on derived display values), `component-library` (existing `Input` / `Label` / `Select` primitives), `design-system` (semantic tokens, 4/8 spacing, no off-scale `gap-5`). Critical: section component does not import from `@/lib/contract-extraction/*` and does not read `extractionResult` from the store.

---

### Task 2 — Zod schema and the global `useIsExtracted` hook

**What & why:** Two pieces. (1) The Zod schema is the single source of truth for Property section validation (used by Task 3 client-side and later by `createProperty`). (2) The `useIsExtracted` hook is the **single global hook** sections use to ask "was this field auto-filled from the contract?" — call sites pass a `'section.field'` path; an internal mapping table translates the path to the right store reads. Keeping the mapping in one place means future sections add their entries here without inventing parallel hooks, and the call site (`useIsExtracted('property.street')`) reads naturally without leaking either the section-data layout or the extraction layout.

The comparison logic ("is the slice value equal to the extracted value, and non-empty?") lives directly inside the hook — no separate `isAutoFilled` helper. The comparison is two lines; an extra file plus its own test suite is over-engineering. The hook is unit-testable on its own via `renderHook` + a fake store, and the mapping table is the only piece that warrants a focused test (it's the part future plans will extend).

**Where:**
- `src/data/properties/property-section-schema.ts` (created)
- `src/data/properties/__tests__/property-section-schema.test.ts` (created)
- `src/app/app/(focused)/p/new/[draftId]/state/use-property-creation.ts` (modified — add `useIsExtracted` and the mapping table)

**How:**

**Zod schema and tests first** in `property-section-schema.test.ts`. Use vitest; the project's existing schema-test conventions are in `src/lib/contract-extraction/__tests__/schema.test.ts` — match that style. Cases:
- Valid minimum input (required fields populated; name omitted; complement omitted) parses successfully.
- Missing each required field individually surfaces a path-targeted error: `postal_code`, `street`, `number`, `city`, `state`. (Match the existing `PropertyFormValues` shape — see `property-form.tsx`.)
- `name` is optional but rejected when length > 100 (matches `validatePropertyCore`'s existing `tooLong` rule).
- `postal_code` accepts the masked Brazilian format (`'01310-100'`) and the bare 8-digit form (`'01310100'`).
- `country_code` defaults to `'BR'` when omitted.
- `property_type` accepts each enum value and `null`; rejects any other string.
- A type-level assertion (`satisfies` or compile-time check) confirms `PropertySectionValues` matches the schema's `z.infer` output.

**Then implement** the schema in `property-section-schema.ts`. Match `PropertyFormValues` field shape (from `property-form.tsx`) so the existing `validateProperty` server action's `PropertyFields` interface remains compatible. Export:
- `propertySectionSchema` — the Zod object.
- `type PropertySectionValues = z.infer<typeof propertySectionSchema>`.
- `defaultPropertySectionValues(): PropertySectionValues` — blank-slate object (empty strings, `country_code: 'BR'`, `property_type: null`). After this lands, the seeding helper in `state/extraction-seeding.ts` swaps its `PropertySectionInitialValues` interface and `defaultPropertySectionValues` constant for these canonical exports — single source of truth for the property slice's shape.

**`useIsExtracted` hook** in `state/use-property-creation.ts`:

Signature:
`useIsExtracted(path: ExtractedFieldPath): boolean`

`ExtractedFieldPath` is a string-literal union type covering every supported `'section.field'` combo. Adding a section means appending its entries to this union. For this plan the supported paths are the Property section's:
- `'property.name'`, `'property.postal_code'`, `'property.street'`, `'property.number'`, `'property.complement'`, `'property.neighborhood'`, `'property.city'`, `'property.state'`, `'property.country_code'`, `'property.property_type'`.

Internally, the hook is backed by a single mapping object that lives next to the hook in the same file. The mapping's type is a `Record` keyed by `ExtractedFieldPath`; each value is an object with two selector fields, both typed as `(state: PropertyCreationStateShape) => unknown`: one named `current` that resolves the current value out of `sectionData` and one named `extracted` that resolves the extracted value out of `extractionResult`. The hook does the comparison without caring about the runtime type. For Property section entries:
- Address fields map current to `s.sectionData.property?.[field]` and extracted to `s.extractionResult?.address?.[field]` (with the snake_case → camelCase rename for `postal_code` → `postalCode`).
- `'property.property_type'` maps to `s.sectionData.property?.property_type` and `s.extractionResult?.propertyType`.
- `'property.name'` and `'property.country_code'` map to their `sectionData.property` field and `extracted: () => undefined` (no extraction source). The hook returns `false` for these consistently.

The hook does two primitive `usePropertyCreationState` calls (one selecting `current`, one selecting `extracted`) and returns `true` iff both values are strictly equal AND `current` is "present" — i.e., not `null`, not `undefined`, not `''`. Rationale for two selectors over a combined-object selector: each is a primitive read, so Zustand's `Object.is` comparison short-circuits re-renders cleanly.

```ts
export function useIsExtracted(path: ExtractedFieldPath): boolean {
  const entry = EXTRACTED_FIELD_MAP[path]
  const current = usePropertyCreationState(entry.current)
  const extracted = usePropertyCreationState(entry.extracted)
  if (current === null || current === undefined || current === '') return false
  return Object.is(current, extracted)
}
```

**Tests** in `state/__tests__/use-property-creation.test.tsx` (extend the existing file, don't fork). Use the existing `renderHook` + fresh-store pattern. Cases:
- Returns `true` when slice value equals extraction value and the slice value is non-empty (string case for an address field).
- Returns `false` when extraction is `null` for the field.
- Returns `false` when slice value differs from extraction value.
- Returns `false` when slice value is `''` (even if extraction is also `''`).
- Returns `true` for `'property.property_type'` when both equal `'apartment'`; returns `false` when slice is `null` regardless of extraction.
- Returns `false` for `'property.name'` and `'property.country_code'` even when slice is non-empty (no extraction source, so the hook can never report auto-filled).

**Verify:** Run the test suite. All schema and hook tests pass. `tsc --noEmit` clean. `lint` clean.

**Check:** `superpowers:test-driven-development` (red → green → refactor for the schema), `data-modeling` (country-agnostic — `country_code` stays in the schema), `frontend-patterns` (Zustand selector idioms — primitive selectors short-circuit re-renders).

---

### Task 3 — Wire Zod live validation: gated Continue + blur-driven field errors

**What & why:** Make Continue disabled until the schema validates, and surface field errors inline on blur. Replace Task 1's local TS interface with the canonical `PropertySectionValues` type. Extend `Section.Actions` with `continueDisabled` (and `continueLoading` while we're at it, since Task 4 needs it for the pending-server-action state).

**Where:**
- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/section.tsx` — extend `SectionActionsProps` with `continueDisabled?: boolean` and `continueLoading?: boolean`; pass both to the Continue `Button` (`disabled`, `loading`).
- `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx` — swap the local TS interface from Task 1 for the imported `PropertySectionValues`; replace any local default-values helper with the imported `defaultPropertySectionValues()` from `property-section-schema.ts` (so there's only one source of truth for the blank shape); add Zod live validation; add `touched` tracking.

**How:**
- Section.Actions extension: both new props are optional with sensible defaults (`continueDisabled = false`, `continueLoading = false`). Existing call sites (`cpf.tsx`, `rent-dates.tsx`, `tenants.tsx`, `expenses.tsx`, `bank.tsx`) must keep working unchanged.
- In `property.tsx`, run `propertySectionSchema.safeParse(values)` per render. Cheap (Zod is small). Derive `canContinue = parseResult.success`. Pass `continueDisabled={!canContinue}` to `Section.Actions`.
- Errors UX: keep a `touched: Set<keyof PropertySectionValues>` in `useState`. On each field's `onBlur`, add the key (`setTouched((t) => new Set(t).add(field))`). On render, for each field, look up `parseResult.error?.flatten().fieldErrors[fieldName]` only when `touched.has(fieldName)`. Render a small `text-destructive text-sm` paragraph below the field — match the existing pattern in `property-form.tsx` (lines 199-201, 248-250).
- Field-error copy: schema `message` strings should be i18n keys (e.g., `'tooLong'`, `'required'`, `'invalidPostalCode'`), not human prose. The section runs them through `t()` so the user sees translated text. Reuse existing `properties.*` keys; add new keys only for genuine gaps.

**Verify:** Manual browser test:
1. Empty form on no-contract path → Continue is disabled.
2. Fill required fields → Continue enables.
3. Blur a required empty field → field error appears below the field.
4. Type into the field with the error → error clears once Zod no longer reports it.
5. Other sections still render their Continue buttons normally — no regression from the `Section.Actions` prop extension.
6. Run the unit tests for the schema and `isAutoFilled` (still passing from Task 2).

**Check:** `frontend-patterns` (live validation, hook ordering), `component-library` (Button `disabled` and `loading` props are canonical — don't reinvent).

---

### Task 4 — Continue handler: server-side duplicate check + advance

**What & why:** Run the server-side duplicate-address check on Continue (the only validation Zod can't do client-side) and advance only on success. Values are already in the store from Task 1, so this task adds no extra persistence — it's purely the server-side trust boundary plus error-to-field mapping. There is no Back handler — Property is the first section, so `Section.Actions` doesn't render Back, and the WizardShell's step-level Back button handles step-level navigation independently of this section.

**When does `validateProperty` run?** Only on Continue tap. **Never** on input change, never on blur, never on focus. Zod handles per-keystroke validation client-side; `validateProperty` is the server-only check (duplicate-address is the case Zod can't cover) and gates advancement, not field UX.

**Where:** `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx`.

**How:**
- Add a local `serverError` state via `useState<Partial<Record<keyof PropertySectionValues, string>>>({})`. This holds errors returned by `validateProperty` keyed by field. It's separate from Zod's blur-driven errors (Task 3) so the per-render Zod loop doesn't wipe it.
- Wrap `ctrl.handleContinue` in a section-local `handleContinue`:
  - Use `useTransition` for the pending state. The transition's boolean drives `continueLoading` on `Section.Actions`.
  - At the start of each attempt, clear `serverError` (`setServerError({})`) — otherwise stale errors from a previous attempt linger after the user fixes the input. The validateProperty result repopulates it if the new attempt still fails.
  - Inside the transition, call `validateProperty(values)` (no `excludePropertyId` — this is a creation, not an edit).
  - On `result.valid === false && result.existingPropertyId`: show the same toast pattern `property-form.tsx` uses (`toast.warning(t('duplicateAddress'), { duration: Infinity, position: 'top-center', action: { label: t('viewExistingProperty'), onClick: () => router.push(`/app/p/${result.existingPropertyId}`) } })`). **Do not advance.** Set `serverError.postal_code` to the duplicate-address i18n key so an inline message appears anchored to the field.
  - On `result.valid === false` without `existingPropertyId`: copy each returned error from `result.errors` into `serverError[fieldName]`. Stay on the section.
  - On `result.valid === true`: call `ctrl.handleContinue()`. (No need to call `setSectionData` — values already live in the store from Task 1's onChange writes.)
- No Back handler. `useSectionController({ isFirst: true })` returns `handleBack: undefined`, and `Section.Actions` skips rendering Back when `onBack` is undefined. The current draft values persist via the store regardless of how the user leaves the section (WizardShell Back, browser navigation, reload).

**Verify:** Manual browser test with both paths:
- Contract path:
  1. Reach Property section with prefilled data → tap Continue → server check runs → advances to next section.
  2. Edit an extracted field → tap Continue → advances.
  3. Use a duplicate address (one already in the user's properties) → toast appears with "View existing", section stays open, postal-code field shows inline error. Edit the postal code → server-error clears → tap Continue with a unique address → advances.
  4. From a later section (e.g., CPF), reopen Property by tapping its header → fields reflect what was entered (read from store), not extraction defaults.
- No-contract path: empty initial state; entering a unique address → Continue advances.
- WizardShell Back: type into a few fields → tap WizardShell Back → return to Step 2 → typed values still present (because the store is the source of truth, not local component state).

**Check:** `frontend-patterns` (server actions return errors via state, never throw to UI; `useTransition` for pending state — `useActionState` is overkill since we're not using a `<form action>`), `component-library` (reuse `sonner`'s `toast.warning` exactly as `property-form.tsx` does — same options).

---

### Task 5 — Auto-filled indicator, property-type radio-card selector, responsive layout

**What & why:** Three visual finishing pieces, all in the section component. The auto-filled caption uses `useIsExtracted('property.field')` from Task 2 (which composes the pure `isAutoFilled` helper with the field-mapping table) to flag fields whose current value matches extraction. The property-type selector becomes a radio-card grid (icon + label per option) instead of a plain Select — a single-tap, glance-readable surface where the extracted choice is visibly pre-selected. The form layout adapts paired-row groupings on desktop while staying stacked on mobile.

**Where:** `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/property.tsx`. New i18n keys in all three message files. Optionally a small co-located helper module if the property-type selector grows past a handful of lines.

**How:**

**Auto-filled indicator.**
- For each field that can be auto-filled (address fields + property type), call `useIsExtracted('property.<field>')` from Task 2. The hook returns `true` when the current value matches what extraction provided and the field is non-empty. Property name and country code paths exist in the mapping but always return `false` (no extraction source) — calling the hook for them is safe and just renders no caption. Call sites never read `extractionResult` or `sectionData.property` for the comparison; the hook handles both.
- When `useIsExtracted` returns `true` AND the field has no Zod error (touched) AND no `serverError`, render a small caption below the field: a lucide `Sparkles` icon (size-3) + muted text reading the new i18n key `propertyCreation.checkout.property.autoFilled` (e.g., `Auto-filled from your contract`). Use `text-muted-foreground` and `text-xs` — matches the CepField status-message precedent in `cep-field.tsx`. **Saved user preference: avoid `text-xs` on mobile when it's the only readable surface. Here the caption sits alongside the primary `Input` content, so `text-xs` is acceptable as auxiliary, matching the CepField precedent. Escalate to `text-sm` only if browser testing shows it's hard to read.**
- Errors win over auto-filled — when a touched Zod error or a `serverError` is present for a field, suppress the caption entirely.

**Property-type radio-card selector.**
- Four options: `apartment`, `house`, `commercial`, `other`. Each option renders as a small Card-shaped tappable surface containing a lucide icon (suggested mappings: `Building2` for apartment, `Home` for house, `Briefcase` for commercial, `MoreHorizontal` for other) and the localized label.
- Selected state: primary border + tinted background. Unselected: standard card border. Use `data-state` attributes for the Radix RadioGroup-style selection pattern, or a button-as-radio with `aria-pressed` if not using RadioGroup.
- Layout: 2-column grid on mobile (`grid grid-cols-2 gap-3`), 4-column on desktop (`md:grid-cols-4`).
- New i18n keys: `properties.propertyTypeLabel`, `properties.propertyTypePlaceholder` (only used as label/legend text; there's no "placeholder" per se for a radio group), `properties.propertyTypes.apartment`, `properties.propertyTypes.house`, `properties.propertyTypes.commercial`, `properties.propertyTypes.other`.
- Check the codebase first for an existing shadcn `RadioGroup` (`npx shadcn@latest add radio-group` if absent — but only after confirming it isn't already installed). If RadioGroup is available, compose with it; otherwise build with native `<button type="button" role="radio" aria-checked={...}>` — both are acceptable. Either way the surface uses the existing `Card` shell tokens (`rounded-card`, semantic borders, `hover:bg-accent`) — no hardcoded color utilities.
- The auto-filled caption sits below the entire property-type group, not below an individual card.

**Responsive layout.**
- Wrap form fields in `flex flex-col gap-5` on mobile.
- On `md:`, the field groupings are:

| Group (top → bottom) | Mobile | Desktop |
|---|---|---|
| Property type | full (2x2 cards) | full (4-up cards) |
| Property name | full | full |
| CEP (CepField) | full | constrained left ~33% (`md:max-w-xs`) — keep CepField label/status visible |
| Street + Number | stacked, two rows | one row, 3-col grid: street `col-span-2`, number `col-span-1` |
| Complement | full | full |
| Neighborhood | full | full |
| City + State | stacked, two rows | one row, 3-col grid: city `col-span-2`, state `col-span-1` |

- Use the 4/8 spacing rhythm. No off-scale gaps. Vertical gap between groups is `gap-5` (matches PropertyForm.Content).
- Mobile structure must remain visually identical to the existing PropertyForm.Content — only desktop pairs columns.

**Verify:** Manual browser test at mobile width and desktop width:
- Mobile: form is single column, identical structure to the existing edit modal's form. Property-type cards in a 2x2 grid.
- Desktop: paired rows, property-type cards across in a row, no sparse whitespace.
- Auto-filled caption appears below extracted fields and below the property-type group when the selected card matches extraction. Disappears the moment the user changes a value. Suppressed when a field has a touched error.
- The property-type radio-card group is keyboard-navigable (arrow keys move selection if RadioGroup, Tab + Enter if button-as-radio) and visually clear which option is selected.

**Check:** `design-system` (4/8 spacing, semantic tokens, no hardcoded utilities), `component-library` (existing `Card` shell tokens; `RadioGroup` if available, else accessible button pattern), `frontend-patterns` (no JS for layout that CSS can do).

---

### Task 6 — Migration: add `property_type` column to `properties`

**What & why:** The spec assigns the `property_type` column migration to this section's plan. Adding it now (additive, nullable, no default) means the future `createProperty` server-action plan ships without a separate migration step. No code in this plan reads or writes the column — the section stores `property_type` only in `sectionData.property`.

**Where:** `supabase/migrations/20260427120000_properties_property_type_column.sql` (new). Then regen Supabase types from local.

**How:**
- Migration adds `property_type property_type null` to `properties`. Include a comment explaining: column is additive, nullable, with no default; populated by the future `createProperty` server action when creating new properties; existing rows remain `null`. **No backfill** — no existing user code reads this column, and the `Partial`/optional semantics are handled at the application layer (the future server action will provide a value for new rows; old rows being `null` is meaningful — "type unknown / not collected at creation time").
- Per `.claude/rules/database-migrations.md`: additive, non-destructive, no rename. No RLS change required (the existing policies on `properties` cover all columns).
- After the migration applies locally (`npx supabase migration up`), regenerate types from the local Supabase instance — **not the linked / production project** per the user's saved preference. The regen overwrites `src/lib/types/database.ts`. There is no `package.json` script for this; run the Supabase CLI directly: `npx supabase gen types typescript --local > src/lib/types/database.ts`.

**Verify:**
- `npx supabase migration up` runs cleanly. The `properties` table has a new `property_type` column nullable.
- After the type regen, `Database['public']['Tables']['properties']['Row']['property_type']` resolves to `'apartment' | 'house' | 'commercial' | 'other' | null`.
- Type check passes. Existing tests still pass.

**Check:** `database-migrations` (additive, non-destructive, no rename, no `db reset`), `data-modeling` (country-agnostic — the column doesn't bake a country/locale assumption), the user's memory note about regenerating types from local.

---

### Task 7 — Final verification + code review

**What & why:** Confirm the full deliverable works end-to-end and meets the spec's quality bar before handing off for user testing.

**How:**
1. Run the type checker, the test suite (vitest), and the linter. Resolve anything the tools flag.
2. Manual browser smoke covering both paths:
   - **Contract path:** upload a contract → wait for extraction → land on Step 2 → Property section opens with extracted values + auto-filled captions → tap Continue with a fresh address → advances to next section → tap Back twice in CPF → returns to Property with persisted values (not extraction). Edit a field, tap Continue with a duplicate address → toast appears, section stays open, postal code shows inline error. Edit again with a unique address → Continue advances.
   - **No-contract path:** "I don't have a contract" → Step 2 → Property section opens empty → Continue is disabled → fill required fields → Continue enables → tap Continue → advances.
   - Reload mid-flow: section state and values persist.
   - Mobile and desktop viewports: layout adapts cleanly; captions and errors render as designed.
3. Dispatch the `superpowers:code-reviewer` agent against the spec sections this plan implements: the "Property details" subsection of `2026-04-22-property-checkout-shell-design.md`, plus relevant cross-cutting rules (Section States, Navigation Behavior, Validation, State Persistence). Provide the agent with the file paths changed by this plan and the spec path. Address every finding the reviewer raises that's in scope — defer out-of-scope findings (e.g., a finding that pertains to the Tenants section).
4. After re-running tools post-fixes, present results to the user. **Do not commit.**

**Check:** `superpowers:code-reviewer`, `superpowers:verification-before-completion` (evidence before assertions — the tool output is the proof, not the agent's word).

---

## Out-of-Scope Notes

These will land in later plans; explicitly NOT addressed here:

- The `createProperty` server action (writes the values to the DB, performs the Storage upload, creates `invitations`, etc.) — its own plan.
- The "Up next" UI tweaks if the spec changes shake out — defer.
- **Server-side property-name auto-derivation** (the actual `formatPropertyName` fallback when `name` is blank at submit time) — already lives in `src/data/properties/actions/create-property.ts` and stays unchanged. This plan only uses `formatPropertyName` client-side as the dynamic placeholder preview (Task 1).
- Pre-filling `propertyType` from extraction is in scope, but no UI explanation that "we read this from your contract" beyond the auto-filled caption — that's the only indicator.
- Editing the property post-creation — handled by the existing edit modal (`PropertyInfoActions`), unaffected by this plan.
- Redirecting away from the wizard on success — the existing scaffold handles the post-Step-2 navigation when the eventual `createProperty` action lands; no change here.
