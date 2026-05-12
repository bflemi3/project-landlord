# Rent & Dates Section — Requirements

**Section id:** `rent-dates`
**Parent spec:** `docs/superpowers/specs/2026-04-22-property-checkout-shell-design.md` §"Rent & dates"
**Sibling reference (patterns to mirror):** `docs/superpowers/plans/2026-04-27-property-checkout-section-property.md` (architecture, store-as-source-of-truth, schema co-location, extraction seeding via `mergeExtractionIntoSectionData`).

This document defines **what** the Rent & Dates section collects, validates, and persists. **How** it gets implemented (file layout, task slices, migration order) is the planner's job.

---

## Scope

The Rent & Dates section is the second section in the property-creation checkout accordion. It collects:

1. Rent amount + currency (and what the amount bundles)
2. Due day of month
3. Contract start and end dates
4. (Collapsible) adjustment details — frequency, method, index, value

The section is **required on the contract path** and **optional (skippable) on the no-contract path**.

The wizard slice doesn't map 1:1 to a single DB table. On wizard save (a future plan), rent maps to `charge_definitions` + `recurring_rules`; adjustment maps to a future `contracts` table or columns. **No DB migrations are needed for this plan.**

---

## Slice Shape (`RentDatesInput`)

Stored under `sectionData['rent-dates']` in the wizard store. Snake_case to match `PropertyInput`. Adjustment fields are flat with shared prefix (no nested object). All fields optional at schema level — section-level required-to-continue is enforced by `onBeforeContinue`.

| Field | Type | Notes |
|---|---|---|
| `amount_minor` | `number \| undefined` | Integer minor units. Capped at `MAX_MINOR_UNITS` (10 digits). |
| `currency` | `'BRL' \| 'USD'` | Defaults to `'BRL'`. |
| `includes` | `string[]` | What the rent bundles, e.g. `['rent', 'condo', 'IPTU']`. Empty = rent-only. Free-form strings; user can edit. Future: prompt to split into separate charge rows. |
| `due_day` | `number \| undefined` | Day of month, integer 1–31. |
| `start_date` | `string \| undefined` | ISO `YYYY-MM-DD`. |
| `end_date` | `string \| undefined` | ISO `YYYY-MM-DD`. Must be ≥ `start_date`. |
| `adjustment_frequency` | `'monthly' \| 'quarterly' \| 'biannual' \| 'annual' \| 'other' \| undefined` | Mirrors `RentAdjustmentFrequency` from extraction. |
| `adjustment_method` | `'index' \| 'fixed_amount' \| 'fixed_percentage' \| 'other' \| undefined` | Mirrors `RentAdjustmentMethod` from extraction. |
| `adjustment_index_name` | `string \| undefined` | e.g. `"IPCA"`. Required when method=`'index'`. |
| `adjustment_fixed_amount_minor` | `number \| undefined` | Required when method=`'fixed_amount'`. Integer minor units. |
| `adjustment_fixed_percentage` | `number \| undefined` | Required when method=`'fixed_percentage'`. `0–100`, supports decimals (e.g. `4.62`). |

**Not stored on the slice (intentionally):**

- **Next adjustment date.** Computed at display time from `start_date + adjustment_frequency`. Helper: `nextAdjustmentDate(start, frequency, today?)`. We accept that contracts specifying non-anniversary adjustment dates will display the anniversary instead — rare edge case, can revisit if needed.

---

## Zod Schema (canonical)

Lives at the location chosen by the planner (recommendation: `src/app/app/(focused)/p/new/[draftId]/state/rent-dates-schema.ts`, re-exported through `state/extraction-seeding.ts` like `PropertyInput`). The slice is wizard-local; no `data/contracts/` domain exists yet.

```ts
import { z } from 'zod'
import {
  MAX_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/data/shared/currency'

const RENT_ADJUSTMENT_FREQUENCIES = ['monthly', 'quarterly', 'biannual', 'annual', 'other'] as const
const RENT_ADJUSTMENT_METHODS = ['index', 'fixed_amount', 'fixed_percentage', 'other'] as const
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const rentDatesSchema = z.object({
  amount_minor: z.number({ error: 'invalidAmount' })
    .int({ error: 'invalidAmount' })
    .positive({ error: 'invalidAmount' })
    .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
    .optional(),
  currency: z.enum(SUPPORTED_CURRENCIES, { error: 'invalidCurrency' }).default('BRL'),
  includes: z.array(z.string()).default([]),

  due_day: z.number({ error: 'invalidDueDay' })
    .int({ error: 'invalidDueDay' })
    .min(1, { error: 'invalidDueDay' })
    .max(31, { error: 'invalidDueDay' })
    .optional(),
  start_date: z.string().regex(ISO_DATE, { error: 'invalidDate' }).optional(),
  end_date: z.string().regex(ISO_DATE, { error: 'invalidDate' }).optional(),

  adjustment_frequency: z.enum(RENT_ADJUSTMENT_FREQUENCIES, { error: 'invalidFrequency' }).optional(),
  adjustment_method: z.enum(RENT_ADJUSTMENT_METHODS, { error: 'invalidMethod' }).optional(),
  adjustment_index_name: z.string().max(50, { error: 'tooLong' }).optional(),
  adjustment_fixed_amount_minor: z.number({ error: 'invalidAmount' })
    .int({ error: 'invalidAmount' })
    .positive({ error: 'invalidAmount' })
    .max(MAX_MINOR_UNITS, { error: 'tooLarge' })
    .optional(),
  adjustment_fixed_percentage: z.number({ error: 'invalidPercentage' })
    .min(0, { error: 'invalidPercentage' })
    .max(100, { error: 'invalidPercentage' })
    .optional(),
}).superRefine((data, ctx) => {
  // end_date ≥ start_date when both are present
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'endDateBeforeStart' })
  }

  // Frequency ↔ method are paired (both or neither)
  if (data.adjustment_frequency && !data.adjustment_method) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_method'], message: 'methodRequired' })
  }
  if (data.adjustment_method && !data.adjustment_frequency) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_frequency'], message: 'frequencyRequired' })
  }

  // Method ↔ value field consistency
  if (data.adjustment_method === 'index' && !data.adjustment_index_name) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_index_name'], message: 'indexNameRequired' })
  }
  if (data.adjustment_method === 'fixed_amount' && data.adjustment_fixed_amount_minor == null) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_fixed_amount_minor'], message: 'fixedAmountRequired' })
  }
  if (data.adjustment_method === 'fixed_percentage' && data.adjustment_fixed_percentage == null) {
    ctx.addIssue({ code: 'custom', path: ['adjustment_fixed_percentage'], message: 'fixedPercentageRequired' })
  }
})

export type RentDatesInput = z.infer<typeof rentDatesSchema>

export function defaultRentDatesInput(): RentDatesInput {
  return {
    amount_minor: undefined,
    currency: 'BRL',
    includes: [],
    due_day: undefined,
    start_date: undefined,
    end_date: undefined,
    adjustment_frequency: undefined,
    adjustment_method: undefined,
    adjustment_index_name: undefined,
    adjustment_fixed_amount_minor: undefined,
    adjustment_fixed_percentage: undefined,
  }
}

export type { SupportedCurrency }
```

---

## Shared Currency Module

New file `src/data/shared/currency.ts` (existing dir). `currency-input.tsx` and `rent-dates-schema.ts` both import from it. The current `SupportedCurrency` definition in `src/components/ui/currency-input.tsx` moves here; the UI primitive imports it back.

```ts
export const SUPPORTED_CURRENCIES = ['BRL', 'USD'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

// 10-digit cap on the cents accumulator: R$99.999.999,99 / $99,999,999.99.
export const MAX_MINOR_UNITS = 99_999_999_99
```

---

## Validation Rules

### Schema-level (live, fires while typing)

Enforced by `rentDatesSchema` — covers internal consistency. Fields are individually optional, so blank fields don't error.

| Rule | Error code |
|---|---|
| `amount_minor` is positive integer ≤ `MAX_MINOR_UNITS` | `invalidAmount` / `tooLarge` |
| `currency` is one of the supported set | `invalidCurrency` |
| `due_day` is integer 1–31 | `invalidDueDay` |
| `start_date` / `end_date` match `YYYY-MM-DD` | `invalidDate` |
| `end_date >= start_date` (when both present) | `endDateBeforeStart` |
| `adjustment_frequency` set ⇒ `adjustment_method` set | `methodRequired` |
| `adjustment_method` set ⇒ `adjustment_frequency` set | `frequencyRequired` |
| `method='index'` ⇒ `adjustment_index_name` set | `indexNameRequired` |
| `method='fixed_amount'` ⇒ `adjustment_fixed_amount_minor` set | `fixedAmountRequired` |
| `method='fixed_percentage'` ⇒ `adjustment_fixed_percentage` set | `fixedPercentageRequired` |
| `adjustment_index_name` ≤ 50 chars | `tooLong` |
| `adjustment_fixed_percentage` ∈ [0, 100] | `invalidPercentage` |

### Section-level required-to-continue

Enforced in `onBeforeContinue`, varies by path. Returns `false` to block advancement, surfaces error inline (toast or field).

| Field | Contract path | No-contract path |
|---|---|---|
| `amount_minor` | required | optional |
| `currency` | always set (defaults to `'BRL'`) | always set |
| `due_day` | required | optional |
| `start_date` | required | optional |
| `end_date` | required | optional |
| `includes` | optional | optional |
| `adjustment_*` | optional (but all-or-nothing as a group, enforced by schema) | optional |

---

## Translation Keys

Add a new top-level `rentDates` namespace for field labels + error codes (mirrors how `properties` works for property fields). Section-level keys (`title`, `subtitle`, status labels) stay under `propertyCreation.checkout.rent-dates` (already exists).

### Field labels & hints (under `rentDates.*`)

| Key | English (placeholder) |
|---|---|
| `rentAmount` | "Monthly rent" |
| `rentAmountHint` | "How much rent the tenant owes each month." |
| `dueDay` | "Due day" |
| `dueDayHint` | "Day of the month rent is due." |
| `startDate` | "Contract start date" |
| `endDate` | "Contract end date" |
| `includes` | "Rent covers" |
| `includesHint` | "What the monthly amount includes." |
| `adjustmentDetails` | "Adjustment details" |
| `adjustmentFrequency` | "How often rent adjusts" |
| `adjustmentMethod` | "How rent adjusts" |
| `adjustmentIndexName` | "Index" |
| `adjustmentFixedAmount` | "Fixed adjustment amount" |
| `adjustmentFixedPercentage` | "Adjustment percentage" |
| `nextAdjustment` | "Next adjustment: {date}" |
| `frequencyOptions.monthly` | "Monthly" |
| `frequencyOptions.quarterly` | "Quarterly" |
| `frequencyOptions.biannual` | "Twice a year" |
| `frequencyOptions.annual` | "Annually" |
| `frequencyOptions.other` | "Other" |
| `methodOptions.index` | "Inflation index" |
| `methodOptions.fixed_amount` | "Fixed amount" |
| `methodOptions.fixed_percentage` | "Fixed percentage" |
| `methodOptions.other` | "Other" |

### Error codes (siblings under `rentDates.*`)

| Key | English (placeholder) |
|---|---|
| `invalidAmount` | "Enter a valid amount." |
| `tooLarge` | "Amount is too large." |
| `invalidCurrency` | "Choose a supported currency." |
| `invalidDueDay` | "Day must be between 1 and 31." |
| `invalidDate` | "Use the date picker." |
| `endDateBeforeStart` | "End date must be on or after the start date." |
| `invalidFrequency` | "Choose how often rent adjusts." |
| `invalidMethod` | "Choose how the adjustment is calculated." |
| `frequencyRequired` | "Choose how often rent adjusts." |
| `methodRequired` | "Choose how the adjustment is calculated." |
| `indexNameRequired` | "Choose an index (e.g. IPCA)." |
| `fixedAmountRequired` | "Enter the fixed adjustment amount." |
| `fixedPercentageRequired` | "Enter the fixed adjustment percentage." |
| `tooLong` | "Too long." |
| `invalidPercentage` | "Percentage must be between 0 and 100." |

Add the same keys to `messages/pt-BR.json` and `messages/es.json`.

---

## Extraction Seeding

Mirrors how `PropertySection` handles extraction — sections never read `extractionResult` directly. The store folds extraction into `sectionData` once via `mergeExtractionIntoSectionData(prev, extraction)`.

### `state/extraction-seeding.ts` updates

`mergeExtractionIntoSectionData` returns `{ ...prev, property, 'rent-dates': rentDates }`. Build the slice from `extraction.rent`, `extraction.contractDates`, `extraction.rentAdjustment` (snake_case rename + value-field fork by method).

| Slice field | Extraction source | Notes |
|---|---|---|
| `amount_minor` | `extraction.rent?.amount` | Already integer minor units. |
| `currency` | `extraction.rent?.currency` | Coerce to `SupportedCurrency`; fall back to `'BRL'` for `null` or unsupported. |
| `includes` | `extraction.rent?.includes ?? []` | Pass-through. |
| `due_day` | `extraction.rent?.dueDay` | |
| `start_date` | `extraction.contractDates?.start` | |
| `end_date` | `extraction.contractDates?.end` | |
| `adjustment_frequency` | `extraction.rentAdjustment?.frequency` | |
| `adjustment_method` | `extraction.rentAdjustment?.method` | |
| `adjustment_index_name` | `extraction.rentAdjustment?.indexName` | |
| `adjustment_fixed_amount_minor` | `extraction.rentAdjustment?.value` if `method === 'fixed_amount'` else `undefined` | |
| `adjustment_fixed_percentage` | `extraction.rentAdjustment?.value` if `method === 'fixed_percentage'` else `undefined` | |

`extraction.rentAdjustment.date` is **dropped** — derived at display time.

`defaultSectionData()` adds `'rent-dates': defaultRentDatesInput()` so the slice is non-undefined from store creation.

### `state/store.ts` persist `merge` backfill guard

Existing backfill: re-seed `property` if persisted slice is missing. Extend with the same guard for `'rent-dates'`:

```ts
const shouldBackfillProperty = /* unchanged */
const shouldBackfillRentDates =
  persisted.path === 'contract' &&
  persisted.extractionResult != null &&
  persisted.sectionData?.['rent-dates'] === undefined
```

Both run through `mergeExtractionIntoSectionData`. User edits (existing slice) are preserved; only missing slices get re-seeded.

### `state/use-property-creation.ts` — `useIsExtracted` plumbing

Extend `ExtractedFieldPath`:

```ts
export type ExtractedFieldPath =
  | `property.${keyof PropertyInput}`
  | `rent-dates.${keyof RentDatesInput}`
```

Extend `EXTRACTION_GETTERS` with rent-dates entries:

| Path | Getter |
|---|---|
| `rent-dates.amount_minor` | `(e) => e.rent?.amount` |
| `rent-dates.currency` | `(e) => coerceCurrency(e.rent?.currency)` |
| `rent-dates.includes` | `(e) => e.rent?.includes` |
| `rent-dates.due_day` | `(e) => e.rent?.dueDay` |
| `rent-dates.start_date` | `(e) => e.contractDates?.start` |
| `rent-dates.end_date` | `(e) => e.contractDates?.end` |
| `rent-dates.adjustment_frequency` | `(e) => e.rentAdjustment?.frequency` |
| `rent-dates.adjustment_method` | `(e) => e.rentAdjustment?.method` |
| `rent-dates.adjustment_index_name` | `(e) => e.rentAdjustment?.indexName` |
| `rent-dates.adjustment_fixed_amount_minor` | `(e) => e.rentAdjustment?.method === 'fixed_amount' ? e.rentAdjustment.value : undefined` |
| `rent-dates.adjustment_fixed_percentage` | `(e) => e.rentAdjustment?.method === 'fixed_percentage' ? e.rentAdjustment.value : undefined` |

Coercion helper (`coerceCurrency`) lives in `src/data/shared/currency.ts` alongside the constants — returns `'BRL'` for null/unsupported.

---

## Form / UX Behavior

| Concern | Behavior |
|---|---|
| Amount input | `<CurrencyInput size="lg" variant="page">` bound to `amount_minor` + `currency`. |
| Bundled rent | If extraction populated `includes` with > 0 items, surface an `<InfoBox>` listing what the rent covers, with edit affordance. Empty `includes` ⇒ no box. |
| Due day | Number input, integer 1–31. |
| Start / end dates | Date pickers (shadcn primitive — see Task 3 of the Property section plan for shadcn install pattern). |
| Adjustment block | Collapsible; default collapsed. Opens automatically when extraction populated any adjustment field. |
| Method ↔ value control | Form swaps the input control based on `adjustment_method`: `index` → text input for index name; `fixed_amount` → CurrencyInput; `fixed_percentage` → number input (0–100, 2 decimals); `other` → no value input. |
| Next-adjustment label | Derived from `start_date + adjustment_frequency` via `nextAdjustmentDate(...)` helper (new file `src/lib/rent-adjustment.ts`). Shown only when both are set. |
| Auto-filled indicator | Each extracted field shows `<AutoFilledIndicator path="rent-dates.<field>" />` (existing component); disappears on edit (handled by `useIsExtracted`). |
| Continue gating | Live Zod via `useFormValidation`. Plus section-level required-to-continue per path (above). Mirror `PropertySection` pattern. |
| Skip behavior | On no-contract path only — `Section.Actions showSkip={!isRequired}`. |

---

## Helper: `nextAdjustmentDate`

New pure helper at `src/lib/rent-adjustment.ts`. Computes the next future adjustment date.

```ts
const FREQUENCY_MONTHS: Record<RentAdjustmentFrequency, number | null> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
  other: null,
}

export function nextAdjustmentDate(
  start: string,                  // ISO YYYY-MM-DD
  frequency: RentAdjustmentFrequency,
  today: Date = new Date(),
): string | null {
  const months = FREQUENCY_MONTHS[frequency]
  if (months == null) return null  // 'other' has no derivable cadence

  const next = new Date(start)
  next.setMonth(next.getMonth() + months)
  while (next <= today) next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}
```

Unit-test in `src/lib/__tests__/rent-adjustment.test.ts` — covers each frequency, the past-anniversary advance loop, and `'other'` returning null. No timezone games — treat the date as a calendar date, not a timestamp.

---

## What's Out of Scope

- DB migrations (no new tables / columns; the slice maps to existing `charge_definitions` + `recurring_rules` on save).
- The "save the wizard" server action (separate plan).
- A future `contracts` table for adjustment metadata (separate plan).
- Splitting `includes` into separate `charge_definitions` rows (future UX prompt).
- Multi-date / irregular adjustment schedules.
- Server-side validation of `RentDatesInput` (no server action consumes it yet).
- IPCA value lookups, reminders, late-payment cascade — `contract-management` skill, separate.

---

## Implementation Slices (suggested)

The planner should slice this into ordered tasks. Suggested cut points (each independently shippable):

1. ✅ **Shared currency module + `SupportedCurrency` move.** Create `src/data/shared/currency.ts`. Update `currency-input.tsx` to import from it; re-export for backwards compatibility. Update existing consumers. Tests still pass.
2. ✅ **`RentDatesInput` schema + slice registration.** New schema file; re-export through `extraction-seeding.ts`; add `'rent-dates'` to `defaultSectionData()`. Translation keys (English) added.
3. ✅ **Wire `rent-dates.tsx` to the store.** Replace local `useState` with `usePropertyCreationState` + `setSectionData`. Just rent amount + currency for now; the form fields land in slice 6.
4. ✅ **Extraction seeding (rent + dates).** Extend `mergeExtractionIntoSectionData` to build the slice. Persist `merge` backfill guard. Extend `EXTRACTION_GETTERS` + `ExtractedFieldPath`. Dates seeded from `extraction.contractDates`.
5. **`nextAdjustmentDate` helper + tests.** Pure module, unit-tested. (Lands with the adjustment subform.)
6. **Full form fields.** Due day ✅, dates ✅ (shadcn Calendar+Popover via `IsoDatePicker` wrapper, side-by-side, end-date `min` bound to start, cross-field `endDateBeforeStart` schema rule). Still pending: bundled-rent InfoBox, adjustment collapsible with method-aware value control, section-level required-to-continue for adjustment fields.
7. **`pt-BR` and `es` translations.** ✅ for shipped fields (rent amount, due day, start/end date, validation codes). Future copy added per slice.

Slice 1 unblocks 2–6. Slice 2 unblocks 3–4. Slices 3, 4, 5 are independent of each other and can land in any order.

---

## Deferred Work — Pick Up Later

The following slice fields and UX details from this spec are **not yet implemented**. Work moved on to the `tenants` section (next in `CHECKOUT_SECTIONS`) before completing them. Pick up here when looping back to finish rent-dates.

### Slice fields not yet on `RentDatesInput`

These are listed in the "Slice Shape" table above but were never added to `rent-dates-schema.ts`, `defaultRentDatesInput()`, `mergeExtractionIntoSectionData`, or `EXTRACTION_GETTERS`:

| Field | Type | Required when |
|---|---|---|
| `includes` | `string[]` | Optional, default `[]` |
| `adjustment_frequency` | `'monthly' \| 'quarterly' \| 'biannual' \| 'annual' \| 'other' \| undefined` | Optional |
| `adjustment_method` | `'index' \| 'fixed_amount' \| 'fixed_percentage' \| 'other' \| undefined` | Optional, paired with `adjustment_frequency` |
| `adjustment_index_name` | `string \| undefined` | Required when `method === 'index'` |
| `adjustment_fixed_amount_minor` | `number \| undefined` | Required when `method === 'fixed_amount'` |
| `adjustment_fixed_percentage` | `number \| undefined` (0–100) | Required when `method === 'fixed_percentage'` |

### Cross-field rules not yet in `superRefine`

- `adjustment_frequency` ↔ `adjustment_method` paired (both or neither) → `methodRequired` / `frequencyRequired`
- `method === 'index'` ⇒ `adjustment_index_name` set → `indexNameRequired`
- `method === 'fixed_amount'` ⇒ `adjustment_fixed_amount_minor` set → `fixedAmountRequired`
- `method === 'fixed_percentage'` ⇒ `adjustment_fixed_percentage` set → `fixedPercentageRequired`

### Form / UX pieces not yet built

- **Bundled-rent InfoBox.** When `extraction.rent.includes` has `> 0` items, render an `<InfoBox>` listing what the rent covers, with edit affordance. Empty `includes` → no box.
- **Adjustment block (collapsible).** Default collapsed. Opens automatically when extraction populated any adjustment field.
- **Method-aware value control.** Form swaps the value input based on `adjustment_method`:
  - `index` → text input for index name
  - `fixed_amount` → CurrencyInput
  - `fixed_percentage` → number input (0–100, 2 decimals)
  - `other` → no value input
- **Next-adjustment label.** Derived from `start_date + adjustment_frequency` via `nextAdjustmentDate(...)` helper. Shown only when both are set.

### Helper module not yet created

- `src/lib/rent-adjustment.ts` — `nextAdjustmentDate(start, frequency, today?)`. Pure helper, unit-tested at `src/lib/__tests__/rent-adjustment.test.ts`. Spec for the helper is in the "Helper: `nextAdjustmentDate`" section above.

### Translation keys not yet added

Missing under `rentDates.*` in `messages/{en,pt-BR,es}.json`:

- `includes`, `includesHint`
- `adjustmentDetails`
- `adjustmentFrequency`, `adjustmentMethod`, `adjustmentIndexName`, `adjustmentFixedAmount`, `adjustmentFixedPercentage`, `nextAdjustment`
- `frequencyOptions.{monthly,quarterly,biannual,annual,other}`
- `methodOptions.{index,fixed_amount,fixed_percentage,other}`
- Error codes: `invalidFrequency`, `invalidMethod`, `frequencyRequired`, `methodRequired`, `indexNameRequired`, `fixedAmountRequired`, `fixedPercentageRequired`, `tooLong`, `invalidPercentage`
