# Property Checkout Shell — Scaffolding Plan (Step 2 Container)

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build the Step 2 accordion shell — the checkout-style container, its state machine, the fixed two-row TopBar, the mobile sticky bottom bar, and the desktop sticky summary panel. Each accordion section renders a "coming soon" placeholder body with a functional action bar (Continue / Back / Skip) so the full state machine is verifiable end-to-end without any real section forms.

**Deliverable:** After uploading a contract (extraction auto-advances) OR tapping "I don't have a contract" in Step 1, the landlord lands on Step 2: a fixed TopBar (nav row + segmented progress row), six accordion sections (first is active with placeholder body + action bar; rest are muted/upcoming), a sticky bottom bar on mobile with 6 dots + disabled "Create property — X remaining" CTA, and a sticky summary panel on desktop listing section state + disabled CTA. Continue / Back / Skip in a section advance the state machine; tapping a completed or skipped section header re-opens it as active. State persists to IndexedDB on every transition. Reload resumes in place.

**Explicit non-goals (deferred to later plans per the spec's Implementation Approach):**
- Individual section forms (Property details, Rent & dates, Tenants, Expenses, CPF, Bank) — each gets its own plan
- Contract pre-fill wiring into section forms
- The `createProperty` server action, Supabase Storage upload, DB writes
- Redesigned success screen (the CTA, when eventually enabled, will route to whatever `/app` exists)
- Success-screen redirect on submit (this plan's CTA stays disabled — no submit logic)

**Spec:** `docs/superpowers/specs/2026-04-22-property-checkout-shell-design.md` (the checkout shell spec). Parent spec: `docs/superpowers/specs/2026-04-16-property-creation-design.md`.

**Depends on:** The existing wizard shell + contract upload (Step 1) shipped in `docs/superpowers/plans/2026-04-21-wizard-shell-and-contract-upload.md`, the extraction engine, and the wizard-state IndexedDB utility. All are in place.

**Blocks:** All six per-section plans (Property details, Rent & dates, Tenants, Expenses, CPF, Bank) and the `createProperty` server-action plan — they slot into the shell this plan creates.

**Code review policy:** After each task, dispatch `superpowers:code-reviewer` to review that task's changes before moving on. Task 7 is the final comprehensive review against the spec sections this plan implements.

**Do not commit during execution.** All work stays uncommitted until the user has tested and approved the full flow in a browser.

---

## Wireframe Discipline (Critical — Read Before Every Visual Task)

**The mockups are structural references, not source code.** Do NOT copy HTML/CSS from them. Every visual detail goes through semantic design tokens, the existing component library (`Card`, `IconTile`, `Badge`, `StepProgress`, `StickyBottomBar`, `DetailPageLayout*`, `Input`), and the rules in the `design-system` and `component-library` skills.

**Per-viewport references:**
- **Mobile implementation tasks** → reference `.superpowers/brainstorm/27525-1776865809/content/mobile-selected.html` for structure, hierarchy, spacing rhythm, and which elements collapse or hide.
- **Desktop implementation tasks** → reference `.superpowers/brainstorm/27525-1776865809/content/checkout-flow-v2.html` for the two-column split, summary panel composition, and TopBar progress row with per-segment labels.

The mockup files differ slightly from the spec (they render 7 progress segments including "Contract"). **The spec is authoritative:** 6 accordion sections = 6 progress segments = 6 mobile dots (no "Contract" segment; Step 1 has no progress bar at all). When the mockups and the spec disagree on count or placement, follow the spec.

Never hardcode color utilities (`bg-zinc-*`, `text-rose-500`, `amber-500/10`, etc.) — use semantic tokens. Never use off-scale spacing (`mt-7`, `gap-5`) — stick to 4/8 rhythm. Never give inputs custom heights — use the `Input` primitive at its default size.

---

## Codebase Context

### Primitives already in place (reuse, don't rebuild)

- `WizardShell` + `WizardShell.TopBar` / `.Back` / `.Close` / `.StepCount` / `.Progress` / `.Steps` / `.Step` / `.ExitPrompt` at `src/components/wizard-shell.tsx`. Both `.TopBar` and `.Step` hardcode `max-w-xl` via a module-level `WIDTH` constant but pass `className` through `cn()` — and `cn()` uses `tailwind-merge`, so passing a wider `max-w-*` className from the consumer **already overrides** the default. No primitive change is needed for width; the new Step 2 page just passes `max-w-5xl` (or similar) as className on both `.TopBar` and `.Step`.
- `StepProgress` at `src/components/step-progress.tsx` — currently takes `current` + `total` and renders a 2-tone segmented bar (`i < current ? bg-primary : bg-border`). **This primitive gets extended** to support per-segment state (`done` / `active` / `upcoming` / `skipped`) and optional per-segment labels. The existing `current` + `total` API stays for back-compat with Step 1-style callers.
- `IconTile` at `src/components/icon-tile.tsx` — has tones `primary` / `muted` / `success` / `warning` / `info` / `destructive`. Used directly for accordion section icons (`muted` for upcoming/skipped, `primary` for active, `success` for completed).
- `Card`, `cardShellClassName` helper at `src/components/ui/card.tsx`. Each accordion section is a `Card` (use default size/variant or override via className — do not stack borders + shadows per the design-system rules).
- `Badge` at `src/components/ui/badge.tsx`. **Gets extended** with `success` + `success-subtle` variants. Today it has only `default` / `secondary` / `destructive` / `outline` / `ghost` / `link` — no success tone, which is needed for the "Done" badge on completed sections.
- `StickyBottomBar` at `src/components/sticky-bottom-bar.tsx` — a `border-t` row with safe-area padding. The existing implementation is `shrink-0` (designed to sit as a sibling of a scrolling area). In this plan it's used inside the scrolling `WizardShell.Steps` container, so the consumer layers `sticky bottom-0 md:hidden` via className to pin it to the viewport bottom on mobile only.
- `DetailPageLayout` family at `src/components/detail-page-layout.tsx`. The inner parts — `DetailPageLayoutBody` (`md:flex md:gap-8`), `DetailPageLayoutMain` (`flex-1 space-y-8`), `DetailPageLayoutSidebar` (`md:w-96 md:shrink-0`) — are what the Step 2 page composes. **Do NOT use the outer `DetailPageLayout` wrapper** — it owns its own `flex h-full flex-col`, scroll area, and `max-w-4xl`, which would double up with `WizardShell.Steps`. The inner three parts are pure layout divs and compose cleanly inside `WizardShell.Step`. Sticky behavior on the sidebar is added via className (`md:sticky md:top-6` or similar) from the consumer — no primitive change.
- `ResponsiveModal` at `src/components/responsive-modal.tsx` — already consumed by `WizardShell.ExitPrompt`, no change.

### Wizard state — Zustand store replaces the parent-owned blob

**New architecture.** The entire property-creation wizard uses a single Zustand store as the source of truth. Every page-level component (TopBar, Step 1, Step 2, future sections, summary panel, mobile bottom bar) reads via a selector hook and writes via a curated action hook. The parent wizard component no longer owns any state other than route-level concerns (exit prompt visibility). Persistence to IndexedDB is a concern of the store, encapsulated inside the hook — UI code never calls `saveWizardState` / `loadWizardState` directly.

**New dependency.** Install `zustand` (not currently in `package.json`). No other state libraries are in the codebase today — this is the first.

**Flat store shape** — a single object (not nested by step) with these fields:

- `hydrating: boolean` — true until the first IDB read resolves; gates the root UI's skeleton.
- `step: 1 | 2` — which wizard step the user is on.
- `contractFile: File | null` — the uploaded contract File, or null.
- `contractFileName: string | null` — mirrors file name.
- `contractFileType: 'pdf' | 'docx' | null` — mirrors file type.
- `extractionResult: ContractExtractionResult | null` — the payload from `extractContractAction`, null until extraction completes (or null forever on the no-contract path).
- `path: 'contract' | 'no_contract' | null` — which entry path the user took. Null until Step 1 commits.
- `sectionStates: Record<SectionId, 'upcoming' | 'completed' | 'skipped'>` — one status per section. Note: `'active'` is not a value here (see status model note below).
- `activeSectionId: SectionId | null` — which section is currently expanded. Null means no section is expanded (flow complete).
- `sectionData: Record<SectionId, unknown>` — per-section form data. Shape-per-section is determined by per-section plans; this scaffold uses an empty record.

**Status model note:** `'active'` is NOT a value in `sectionStates`. Whether a section is currently expanded is tracked by `activeSectionId` alone and is orthogonal to completion status. A section can be `completed` and also be `activeSectionId` (re-opened to edit — rendered expanded, but its underlying status stays `completed` so progress / summary / CTA-enabled calculations don't change). No "prior state" bookkeeping.

**Two public hooks — strict read/write separation:**

- `useWizardState<T>(selector: (state: WizardState) => T): T` — selector-based read, re-renders only on slice change. Mirrors Zustand idiom.
- `useWizardActions(): WizardActions` — stable-ref action bag. Never triggers re-renders.

Both exported from `src/app/app/(focused)/p/new/use-wizard-state.ts`. The Zustand store itself is an internal detail at `src/app/app/(focused)/p/new/wizard-store.ts`; UI code does not import the store directly — only via these hooks.

**Action surface (all actions live on the store; `useWizardActions` returns them):**

| Action | Signature | What it does |
|---|---|---|
| `goToStep` | `(step: 1 \| 2) => void` | Sets `step` |
| `setContractFile` | `(file: File, name: string, type: 'pdf' \| 'docx') => void` | Writes all three contract fields atomically |
| `clearContractFile` | `() => void` | Clears all three contract fields |
| `commitContractOutput` | `(next: { extractionResult, path } \| (prev => { extractionResult, path })) => void` | Non-primitive → `SetStateAction`-style updater. Writes `extractionResult` + `path` atomically |
| `openSection` | `(id: SectionId \| null) => void` | **Primitive** — sets `activeSectionId = id`. Does NOT touch status. Composed by the three below |
| `completeCurrentSection` | `() => void` | Marks current `completed`, computes next upcoming id, calls `openSection(nextId \|\| null)` |
| `skipCurrentSection` | `() => void` | Marks current `skipped`, computes next upcoming id, calls `openSection(nextId \|\| null)`. Throws / no-ops if current is required for `path` |
| `goToPreviousSection` | `() => void` | Computes previous section id, calls `openSection(prevId)`. No status change |
| `setSectionData` | `<T>(id: SectionId, next: T \| ((prev: T) => T)) => void` | Non-primitive → `SetStateAction`-style |
| `clearWizard` | `() => void` | Full reset + IDB delete |

**Any setter that targets non-primitive state uses the `SetStateAction<T>`-style updater.** Primitives (numbers, strings, ids) take direct values. Rule: if the state type is an object or array, the setter must accept both a value and a `(prev) => next` function.

**Persistence (encapsulated inside the store module):**

- On the wizard route's first mount, the hook triggers `loadWizardState` once, seeds the store, flips `hydrating: false`. A module-level "has hydrated" flag prevents duplicate loads.
- Any action that changes persisted fields schedules a debounced (300–500ms trailing) `saveWizardState` write via a single store subscriber. UI re-renders immediately; the write catches up.
- Flush pending writes on `visibilitychange === 'hidden'` and on unmount.
- Version mismatch (record.version !== 2) → treated as "no state," store uses defaults.
- Write shape is the full flat state minus `hydrating` (don't persist the transient flag).

**Hydration UI pattern:**

- The route root reads `hydrating` via `useWizardState(s => s.hydrating)`.
- While `hydrating === true`, the root renders a full-page skeleton (structurally matching Step 2's accordion layout — see section skeleton convention below).
- When `hydrating === false`, the root renders `<UploadContract />` or `<PropertyCheckoutShell />` based on `step`.
- Children below the gate never check `hydrating` — they assume state is populated.

**Section skeleton convention:**

Every section component (added in per-section plans, stubbed in this plan) exports a `Skeleton` subcomponent alongside its main component. Consumed by:
- **Step 1** — during contract extraction, the waiting UI composes every section's `Skeleton` in the same layout Step 2 will render, so the visual transition from Step 1 → Step 2 is seamless (only the shimmer banner at the bottom disappears and skeletons swap for real bodies).
- **Step 2 / route root** — during `hydrating === true`, the same skeletons fill the page.

For this plan, the placeholder section body exports a single trivial `PlaceholderSection.Skeleton` (a shimmer bar + a shimmer subtitle). The real section-specific skeletons ship with their per-section plans. The plan locks in the *export convention* so future sections conform: `export function FooSection() {...}; FooSection.Skeleton = function FooSectionSkeleton() {...}`.

**Extraction stays on Step 1.** No store flag for extraction. Step 1 handles its own extraction state locally (same server action as today). The only change: Step 1's "extracting…" view is restructured to compose the section skeletons in the same layout Step 2 will render, so the transition into Step 2 feels instant.

### Current wizard flow (to modify)

- `src/app/app/(focused)/p/new/property-creation-wizard.tsx` is the top-level client component. Today it renders `UploadContract` (Step 1) and `ReviewExtraction` (Step 2) AND owns every piece of persisted state for both. **`ReviewExtraction` is being replaced** by the accordion shell per the spec's "the current review-extraction step is temporary and will be replaced by this flow." Delete `src/app/app/(focused)/p/new/steps/review-extraction.tsx` and its tests in this plan.
- **Parent wizard becomes extremely thin.** Post-plan responsibilities: (1) read `hydrating` + `step` from the store; render a full-page skeleton while hydrating; (2) render `PropertyCreationTopBar` + either `UploadContract` or `PropertyCheckoutShell` based on `step`; (3) render the exit prompt modal (open state is local React state — not persisted). That's it. No `wizardData`, no `handleFileSelected`, no `handleExtracted`, no `handleFileCleared`, no `EMPTY_DATA`. Everything else goes through the store.
- **`UploadContract` refactor.** All its persisted state (file, filename, filetype, extractionResult, path) comes from `useWizardState` selectors. All writes go through `useWizardActions()` — `setContractFile` on file select, `clearContractFile` on remove, `commitContractOutput` + `goToStep(2)` on successful extraction, `commitContractOutput({ extractionResult: null, path: 'no_contract' })` + `goToStep(2)` on "I don't have a contract." The `onExtracted` / `onFileSelected` / `onFileCleared` / `initialFile` / `autoExtract` prop surface is removed entirely — `UploadContract` takes zero props related to wizard state.
- **Step 1's extraction view restructure.** While extraction is in flight, Step 1 renders the same layout Step 2 will show (`DetailPageLayoutBody` + accordion skeleton stack + summary-panel skeleton + mobile-bottom-bar skeleton), composed from each section's exported `Skeleton` subcomponent, plus the existing `TextShimmer` "Extracting…" banner at the bottom. When extraction succeeds, Step 1 calls `commitContractOutput({...})` + `goToStep(2)`; the visual continuity into Step 2 is the user's perception of instant response.
- **`PropertyCheckoutShell` becomes a thin composition layer.** No state machine owned here — the state machine is in the store's actions. Its job: render `DetailPageLayoutBody` + `CheckoutAccordion` populated from `sectionStates` + `activeSectionId` + `sectionData` (via selectors), render the desktop sidebar summary panel, render the mobile `StickyBottomBar`. Section components (future plans) invoke `completeCurrentSection` / `skipCurrentSection` etc. directly via `useWizardActions()` — the shell does not wire transition callbacks down.
- **Resume-extraction case.** On hydration, if we find `step === 2` AND `contractFile` is populated AND `extractionResult === null` AND `path === null`, it means extraction was interrupted before completion. In that case we force `step = 1` during hydration post-processing so the user lands back on Step 1 (which re-triggers extraction from its own effect, showing the skeleton layout). This preserves today's `autoExtractOnMount` behavior without needing a dedicated flag.

### i18n

Locale files at `messages/{en,pt-BR,es}.json` have a `propertyCreation` namespace. Extend it with a `propertyCreation.checkout` subtree covering: the TopBar title, section identifiers (title + subtitle for each of the six sections), per-section placeholder body copy ("Coming soon" single sentence per section), action bar labels (Continue / Back / Skip), status badge labels (Done / Skipped / Up next / In progress), the summary panel header, the "X of Y sections remaining" template, the "Create property" CTA + "— X remaining" suffix, and the disabled-state hint copy. All three locales ship in this plan.

### Testing

The project has vitest for unit tests and integration tests under `src/**/__tests__/`. New primitive extensions (`StepProgress`, `Badge`) ship with unit tests. The accordion state machine (Task 5) ships with unit tests covering each transition. The end-to-end wizard behavior is verified in the browser — no new e2e harness is added in this plan.

### Do not touch

- `PropertyForm` + `CepField` — consumed by the per-section Property Details plan (not this one).
- `createProperty` server action + related RPCs — untouched; the `Create property` CTA in this plan is a disabled stub.
- The `SlideIn` transition between Step 1 and Step 2 — keep it; nothing in this plan changes step-level transitions.

---

## File Structure

**New files:**
- `src/app/app/(focused)/p/new/wizard-store.ts` — Zustand store. State shape, action implementations (all invariants + state-machine logic live here), persistence subscriber (debounced save, flush on unmount + visibilitychange). Internal — not imported by UI code.
- `src/app/app/(focused)/p/new/use-wizard-state.ts` — exports `useWizardState(selector)` and `useWizardActions()`. Thin public API over the store. Also handles one-time hydration (kicks off `loadWizardState` on first render, sets `hydrating: false` when done; includes the resume-extraction post-processing).
- `src/app/app/(focused)/p/new/property-creation-top-bar.tsx` — `PropertyCreationTopBar` client component. Reads `step`, `sectionStates`, `activeSectionId` directly from the store via `useWizardState`. Reads actions (`goToStep` for back button) via `useWizardActions`. Takes no props related to wizard state — only `onExit` (exit-prompt trigger, which is local state in the parent).
- `src/app/app/(focused)/p/new/property-checkout-shell.tsx` — Step 2 root. Pure composition: reads `sectionStates`, `activeSectionId`, `sectionData`, `path` from the store via selectors; renders `DetailPageLayoutBody` + `CheckoutAccordion` + `DetailPageLayoutSidebar` (desktop summary) + mobile `StickyBottomBar`. No props. No state machine here.
- `src/app/app/(focused)/p/new/checkout-sections.ts` — static configuration: the six sections in order, each with `{ id, titleKey, subtitleKey, icon, requiredInContractPath, requiredInNoContractPath }`. Source of truth for section identity across the shell, summary panel, mobile dots, and the store's state-machine action implementations.
- `src/app/app/(focused)/p/new/placeholder-section.tsx` — the "coming soon" placeholder section body + `PlaceholderSection.Skeleton` subcomponent. Exports the convention. Used for every section in this plan until per-section plans replace it.
- `src/app/app/(focused)/p/new/step-one-skeleton-layout.tsx` — composes `PlaceholderSection.Skeleton` × 6 into the full Step-2-matching layout (accordion stack + summary sidebar + mobile bottom bar) used by Step 1's extraction view AND the route root's hydration gate. Single source of truth for "skeleton layout."
- `src/components/checkout-accordion.tsx` — reusable `CheckoutAccordion` compound component: `CheckoutAccordion` (root, reads active id + passes through to Radix), `CheckoutAccordion.Section` (takes `id`, `status`, `isActive`, `title`, `subtitle`, `icon`, `summary?`, children), `CheckoutAccordion.Actions` (Back / Skip / Continue row with border-top separator), `CheckoutAccordion.Summary` (collapsed-completed slot indented to clear the icon tile). Built on shadcn `Accordion` in `type="single" collapsible={false}` mode. Sections take `onActiveChange` at the root; action-bar buttons call actions from `useWizardActions` in the consumer.
- `src/components/ui/accordion.tsx` — shadcn accordion primitive installed via `npx shadcn@latest add accordion`.
- Test files next to the above new components (`__tests__/` subfolders) covering: StepProgress segment states + optional labels, Badge success variants, CheckoutAccordion rendering across `(status, isActive)` combinations, wizard-store action invariants (openSection-composed transitions, required-section skip-guard, status-preserved-on-reopen), hydration + debounced-persistence timing.

**Modified files:**
- `src/components/step-progress.tsx` — extended API: either `{ current, total }` OR `{ segments: SegmentState[], labels?: string[] }`. Both render paths coexist.
- `src/components/ui/badge.tsx` — adds `success` (solid emerald on `bg-success` / `text-success-foreground`) and `success-subtle` (tinted `bg-success-subtle` / `text-success-subtle-foreground`) variants.
- `src/lib/wizard-state/index.ts` — updates `PropertyCreationData` interface to the new flat shape (adds `extractionResult`, `path`, `sectionStates`, `activeSectionId`, `sectionData`; keeps `contractFile`, `contractFileName`, `contractFileType`). Bumps `PROPERTY_CREATION_STATE_VERSION` from `1` to `2`. `saveWizardState` / `loadWizardState` signatures are unchanged — they remain generic helpers that read/write the full record. Exports `SectionId` + `SectionStatus` types.
- `src/app/app/(focused)/p/new/property-creation-wizard.tsx` — becomes extremely thin: only local state is `exitPromptOpen`. Reads `hydrating` + `step` from the store. While `hydrating`, renders `<StepOneSkeletonLayout />`. Once hydrated, renders `<PropertyCreationTopBar onExit={...} />` + either `<UploadContract />` (step 1) or `<PropertyCheckoutShell />` (step 2). Passes zero wizard-state props to any child.
- `src/app/app/(focused)/p/new/steps/upload-contract.tsx` — refactored to read file / filename / filetype from the store via `useWizardState` selectors and write via `useWizardActions` (`setContractFile`, `clearContractFile`, `commitContractOutput`, `goToStep`). Drops all state-related props (`initialFile` / `initialFileType` / `autoExtract` / `onFileSelected` / `onExtracted` / `onFileCleared`). The extraction-in-flight view is restructured to render `<StepOneSkeletonLayout />` plus the existing `TextShimmer` "Extracting…" banner. On successful extraction: `commitContractOutput({ extractionResult, path: 'contract' })` then `goToStep(2)`. `handleNoContract`: `commitContractOutput({ extractionResult: null, path: 'no_contract' })` then `goToStep(2)`; drops the toast (the wizard advance is the feedback now).
- `messages/en.json`, `messages/pt-BR.json`, `messages/es.json` — new `propertyCreation.checkout` subtree.

**Deleted files:**
- `src/app/app/(focused)/p/new/steps/review-extraction.tsx` and any test file covering it. Replaced entirely by the accordion shell per spec.

---

## Tasks

### Task 1 — Install Zustand, build the store + hook, scaffold the new files, refactor the parent + Step 1

**What:** Install `zustand`. Build the wizard store (state + actions + persistence subscriber) and the two public hooks. Scaffold the Step 2 deliverable (`property-checkout-shell.tsx`) + `PropertyCreationTopBar` + `PlaceholderSection` + `StepOneSkeletonLayout` in their final layout shape, with imports that resolve (the extended primitives land in Tasks 2–5). Extend persisted state shape + bump version. Refactor `property-creation-wizard.tsx` to the thin shell and refactor `UploadContract` to consume the store. Delete `review-extraction.tsx`. Migrate existing tests that break.

**Why (deliverable-first):** The Step 2 page is the user-facing deliverable. The store is the foundation that enables every other task (TopBar reads from it, sections will read from it, shell composes from it). Slamming both into one task keeps the branch compilable and runnable as early as possible; subsequent tasks only add depth (primitive extensions, accordion polish, final wiring).

**Where:**

**Install dependency:**
- Run `pnpm add zustand` at the repo root. Verify it lands in `package.json` `dependencies` (not `devDependencies`).

**Checkout sections config FIRST** at `src/app/app/(focused)/p/new/checkout-sections.ts` (must exist before `wizard-state/index.ts` is updated, because `SectionId` is derived here and imported there):
- Export a static array `CHECKOUT_SECTIONS` of six sections in spec order: Property, Rent & dates, Tenants, Expenses, CPF, Bank. Each entry: `{ id, titleKey, subtitleKey, icon, requiredInContractPath, requiredInNoContractPath }`. Ids are lowercase kebab strings (e.g., `'property'`, `'rent-dates'`, `'tenants'`, `'expenses'`, `'cpf'`, `'bank'`). Icons from `lucide-react`.
- Derive and export `SectionId` as the string-literal union from the `id` field (e.g., `type SectionId = (typeof CHECKOUT_SECTIONS)[number]['id']`).
- Export a helper `getRequiredSectionIds(path: 'contract' | 'no_contract')` that returns `SectionId[]` by filtering on the relevant `requiredIn...` flag. Used by the store's skip-guard and by the shell.

**Wizard-state updates** at `src/lib/wizard-state/index.ts`:
- Import `SectionId` from `checkout-sections.ts` (just created).
- Update `PropertyCreationData` to the new flat shape: add `extractionResult: ContractExtractionResult | null`, `path: 'contract' | 'no_contract' | null`, `sectionStates: Record<SectionId, SectionStatus>`, `activeSectionId: SectionId | null`, `sectionData: Record<SectionId, unknown>`. Keep the existing contract fields as-is.
- Bump `PROPERTY_CREATION_STATE_VERSION` from `1` to `2`.
- Export `SectionStatus` as `'upcoming' | 'completed' | 'skipped'`. Re-export `SectionId` from `checkout-sections.ts` as a convenience.
- `saveWizardState` / `loadWizardState` / `clearWizardState` signatures unchanged.

**Zustand store** at `src/app/app/(focused)/p/new/wizard-store.ts`:
- Create a Zustand store with `create<WizardState & { actions: WizardActions }>`. Actions nested under `state.actions` is a common convention that keeps them selectable in one shot.
- Initial state: all fields at defaults (contract fields null, extractionResult null, path null, step `1`, `hydrating: true`, all sections `upcoming`, `activeSectionId: <first section id>`, `sectionData: {}`).
- Implement every action from the Action Surface table in Codebase Context. The state-machine invariants (openSection composed by the three transitions, required-section skip-guard, status preservation on reopen) live here. Actions use Zustand's `set` + `get` idiomatically.
- Persistence subscriber: use Zustand's `subscribe` to watch the persisted slice of state (everything except `hydrating`). Debounce writes with a 300ms trailing timer. On `document.visibilitychange === 'hidden'` and on the store's `destroy` signal (via an exported `flush()` helper), clear the timer and write synchronously. The subscriber calls `saveWizardState` with `{ version: 2, currentStep: state.step, updatedAt: new Date().toISOString(), data: <persisted slice> }`.
- Export a single `hydrate(wizardKey)` function that reads once from `loadWizardState`, applies version-mismatch guards (invalid version → keep defaults), applies the resume-extraction post-processing (if `step === 2 && contractFile && !extractionResult && !path`, force `step = 1`), and flips `hydrating: false`. Idempotent — if already hydrated, no-op.

**Hook module** at `src/app/app/(focused)/p/new/use-wizard-state.ts`:
- Export `useWizardState<T>(selector)` — direct passthrough to the Zustand store's hook, with a thin wrapper that triggers `hydrate(wizardKey)` on first render if not already hydrated. The `wizardKey` is derived from the `draftId` in the URL via `useParams` (hook is rendered only inside the wizard route). Hydration is fired in a `useEffect` with an empty dep array + the module-level guard.
- Export `useWizardActions()` — returns `store.getState().actions`. Actions are defined once at store initialization and the reference never changes, so this call does NOT subscribe to the store and the component does NOT re-render on action-call side effects. Consumers can destructure freely without memoization.
- No other exports. The store itself is not imported outside this module.
- Tests (add to `src/app/app/(focused)/p/new/__tests__/use-wizard-state.test.tsx`): assert that (a) first render triggers a single `loadWizardState` call (mock it), (b) after hydration the store reflects the loaded data, (c) firing `completeCurrentSection` flips the underlying status AND advances `activeSectionId` in one update (re-render fires once, not twice), (d) `openSection(id)` preserves status of both previously-active and newly-active sections, (e) `skipCurrentSection` throws / no-ops when the section is required for the current path, (f) the persistence subscriber is called with the expected shape after the debounce window.

**Scaffold the Step 2 deliverable** at `src/app/app/(focused)/p/new/property-checkout-shell.tsx`:
- `'use client'` component. Zero props. Reads `sectionStates`, `activeSectionId`, `sectionData`, `path` via `useWizardState` selectors; reads `{ completeCurrentSection, skipCurrentSection, goToPreviousSection, openSection, setSectionData }` from `useWizardActions`.
- Render: `<DetailPageLayoutBody>` with `<DetailPageLayoutMain>` (a TODO placeholder noting "Task 6 will wire `CheckoutAccordion` here, fed by six `PlaceholderSection` bodies") + `<DetailPageLayoutSidebar className="md:sticky md:top-6">` (summary panel placeholder — a bordered card with the 6 section titles + section status dots). Below the Main column on mobile only (`md:hidden`): `<StickyBottomBar className="sticky bottom-0 md:hidden">` with 6 status dots + disabled "Create property" CTA.
- Task 6 will fill in the real accordion + the real summary panel + real CTA wiring. This task ships the structural shell so the route is loadable end-to-end.

**Scaffold the TopBar** at `src/app/app/(focused)/p/new/property-creation-top-bar.tsx`:
- `'use client'` component. Props: only `onExit: () => void` (because the exit-prompt modal's open state lives in the parent wizard's local React state, not in the store).
- Reads `step`, `sectionStates`, `activeSectionId` from `useWizardState`. Reads `goToStep` from `useWizardActions` for the Back button.
- Step 1 branch: `<WizardShell.TopBar className="max-w-5xl">` with `<WizardShell.StepCount>` (title from i18n) + `<WizardShell.Close>`. No Back (Back is hidden by `WizardShell.Back`'s internal `firstStepOnly` check at `src/components/wizard-shell.tsx:145`). No progress row.
- Step 2 branch: `<WizardShell.TopBar className="max-w-5xl">` with `<WizardShell.Back onClick={() => goToStep(1)}>` + `<WizardShell.StepCount>` + `<WizardShell.Close>`. Below the TopBar: a width-constrained row with `<StepProgress>`. For this task, stub the progress row with the legacy `current/total` API (Tasks 2 + 4 add per-segment state + labels).

**Scaffold the placeholder section** at `src/app/app/(focused)/p/new/placeholder-section.tsx`:
- Exports `PlaceholderSection({ sectionId })` — renders a translated single sentence ("Coming soon") per section.
- Exports `PlaceholderSection.Skeleton` — a compact shimmer bar + subtitle shimmer, sized to roughly match the section header + one line of content. Uses the existing shimmer/skeleton primitives in the codebase (scan for what's in use — the `TextShimmer` primitive from the recent commit is one option; a plain `animate-pulse bg-muted` block is another). Use `design-system` tokens, no hardcoded colors.
- Establishes the convention: future per-section plans replace `PlaceholderSection` with their real component, and each must export a `Skeleton` subcomponent with equivalent dimensions.

**Compose the skeleton layout** at `src/app/app/(focused)/p/new/step-one-skeleton-layout.tsx`:
- Exports `StepOneSkeletonLayout` — renders the full Step 2 structure (`DetailPageLayoutBody` + 6 stacked `PlaceholderSection.Skeleton`s in the main column + a summary-panel skeleton in the sidebar + a mobile bottom-bar skeleton) with no interactivity. Consumed by Step 1's extraction-in-flight view AND by the route root's `hydrating` gate.

**Refactor the wizard parent** at `src/app/app/(focused)/p/new/property-creation-wizard.tsx`:
- Delete: `EMPTY_DATA`, `wizardData`, `handleFileSelected`, `handleExtracted`, `handleFileCleared`, `initialFile`, `autoExtractOnMount`, the resume-effect reading from `loadWizardState`, the `ref` for first-resume, the inline `posthog.capture('property_creation_wizard_resumed', ...)` call (move that into the store's `hydrate` function so it stays attached to hydration, not the parent lifecycle).
- Keep: the exit-prompt open state + its handlers (`handleExit`, `handleSaveForLater`, `handleDiscard` — the latter calls `clearWizard` action instead of `clearWizardState` directly).
- Read `hydrating` + `step` from `useWizardState`. While `hydrating`, render `<StepOneSkeletonLayout />` inside `<WizardShell>`. Once hydrated, render the TopBar + `<UploadContract />` at step 1 or `<PropertyCheckoutShell />` at step 2.
- Pass zero wizard-state props to any child.

**Refactor Step 1** at `src/app/app/(focused)/p/new/steps/upload-contract.tsx`:
- Remove props `initialFile`, `initialFileType`, `autoExtract`, `onFileSelected`, `onExtracted`, `onFileCleared`. Component takes zero props.
- Read `contractFile`, `contractFileName`, `contractFileType`, `extractionResult`, `path` via `useWizardState` selectors. Read `{ setContractFile, clearContractFile, commitContractOutput, goToStep }` via `useWizardActions`.
- On file select → `setContractFile(file, name, type)` → kick off extraction (existing `extractContractAction`) via the current local state pattern (useActionState / similar — preserve today's mechanics). While extraction is in flight, the component renders `<StepOneSkeletonLayout />` + the existing `TextShimmer` "Extracting…" banner at the bottom (replaces today's inline extraction UI). On extraction success → `commitContractOutput({ extractionResult: result, path: 'contract' })` → `goToStep(2)`. On extraction failure → today's error handling continues to apply; `setContractFile` is already written so the file stays for retry.
- Auto-extract-on-resume: on mount, if `contractFile` is set and `extractionResult` is null and `path` is null, kick off extraction automatically. (This is the resume case after `hydrate` has forced `step = 1`.)
- `handleNoContract`: preserve the `no_contract_path_clicked` PostHog event, remove the toast, call `commitContractOutput({ extractionResult: null, path: 'no_contract' })` then `goToStep(2)`.

**Migrate tests** at `src/app/app/(focused)/p/new/steps/__tests__/upload-contract.test.tsx`:
- Tests pass zero wizard-state props now. Any test that verifies resume behavior sets up state by calling store actions before rendering (use the store's raw handle in test-only utilities, or seed `loadWizardState`'s mocked return).
- The three `no_contract_path_clicked` tests (search for that string, around lines 381/417/457): drop the "toast was shown" assertion, add an assertion that the store's `step` is now `2` and `path` is `'no_contract'` after the click. PostHog event assertion stays.

**Delete** `src/app/app/(focused)/p/new/steps/review-extraction.tsx` and any test file that exclusively exercises it.

**Verification:** Type checker clean. Existing `upload-contract.test.tsx` tests pass against the new API. New `use-wizard-state.test.tsx` tests pass. Load the page in a browser and confirm: fresh draft → Step 1 renders upload UI; select a file → immediately see the skeleton layout with shimmer banner; extraction completes → Step 2 renders with all 6 sections (first active, placeholder body, rest upcoming); tap "I don't have a contract" on a fresh draft → skeleton-less advance to Step 2. Reload the page mid-Step-2 → `hydrating` gate shows skeleton layout briefly, then resumes at the same section state. Reload mid-extraction (interrupt network) → `hydrate` forces step back to 1, extraction auto-retriggers.

**Check:** `component-library` (DetailPageLayout parts, StickyBottomBar, IconTile, Card, Badge selection); `design-system` (tokens, spacing rhythm, tone discipline — skeletons use `bg-muted` not hardcoded grays); `frontend-patterns` (client-boundary placement, selector-based reads, stable action refs); `superpowers:test-driven-development` (store action tests written before implementation); `testing` (store-test conventions). The `frontend-patterns` skill's rules about hook ordering + useMemo for derived state apply to every selector usage.

---

### Task 2 — Extend `StepProgress` for per-segment state + optional labels (TDD)

**What:** Extend the `StepProgress` primitive so one component serves both the existing wizard-level bar (Step 1's 2-segment progress, not actually rendered on Step 1 per spec, but keep the API compatible) AND the new section-level bar on Step 2 (6 segments, per-segment state: `done` / `active` / `upcoming` / `skipped`, with optional per-segment labels displayed below each segment on desktop).

**Why:** Both the spec and the design mockup for desktop explicitly call for a labeled, state-aware segment bar. Keeping it on the existing primitive (rather than forking) matches the spec's "same component powers both the wizard-level bar and this section-level bar" directive and keeps the component catalog small.

**Where:** `src/components/step-progress.tsx`. Write tests first in `src/components/__tests__/step-progress.test.tsx` covering: (a) legacy `{ current, total }` call path still renders the correct active-count visual, (b) new `{ segments: SegmentState[] }` call path renders per-segment color per state (done + active both use `bg-primary` with different opacity per mockup, upcoming uses `bg-border` / `bg-muted`, skipped uses a muted distinct visual — decide the exact token pairing via `design-system`), (c) optional `labels?: string[]` renders a label row below the segments with the active segment's label visually emphasized (foreground + semibold) and others muted. Implement the component to pass the tests. Keep the legacy API intact — the union-typed props let consumers pick either shape.

**Design decisions for segment tokens:**
- `done` → `bg-primary`
- `active` → `bg-primary` with reduced opacity (mockup uses 0.5; match via a design-system opacity utility — do NOT hardcode)
- `upcoming` → `bg-border` (already the current default)
- `skipped` → a muted token that's visually distinct from upcoming — pick from the design-system catalog; document the choice in a one-line code comment
- Labels: `text-xs` on desktop (`md:`), `text-muted-foreground` for non-active, `text-foreground font-semibold` for active. Labels are opt-in via the `labels` prop; when absent, only segments render.

**Responsive rule:** The `labels` row is only rendered when labels are passed. The consumer (`PropertyCreationTopBar`) decides when to pass them — typically only on the desktop version of the Step 2 progress row. But the primitive supports an optional prop `hideLabelsOnMobile?: boolean` (default `true`) that wraps the label row in a class that hides it below `md:`, so a single call site can provide labels and let the primitive handle responsive hiding. Decide the prop shape while writing the tests.

**Verification:** Run the test suite — the new tests pass and pre-existing Step 1 callers (if any use the legacy API) still render correctly.

**Check:** `frontend-patterns` (React component conventions, props shape), `design-system` (token choice for skipped state, spacing rhythm for labels, `text-xs` minimum on desktop only — per `feedback_no_text_xs_mobile.md` the mobile label row stays hidden, so `text-xs` is acceptable here), `superpowers:test-driven-development`.

---

### Task 3 — Extend `Badge` with `success` and `success-subtle` variants (TDD)

**What:** Add two new variants to the existing `Badge` component: `success` (solid emerald, used nowhere in this plan directly but paired for completeness and future use) and `success-subtle` (tinted 10%-alpha emerald background with darker readable foreground — used for the "Done" badge on completed accordion sections).

**Why:** The spec and mockups require a green-tinted "Done" badge with a checkmark icon. The current `Badge` has no success variants, and the design-system skill forbids hardcoding color utilities inline. Extending the primitive keeps the catalog coherent and reusable across future surfaces.

**Where:** `src/components/ui/badge.tsx`. Write tests first in `src/components/ui/__tests__/badge.test.tsx` (create the test file if absent) covering: (a) `variant="success"` renders `bg-success text-success-foreground`, (b) `variant="success-subtle"` renders `bg-success-subtle text-success-subtle-foreground`, (c) icon-only composition (badge with only an SVG child and no text) renders correctly with tight padding — the existing `has-data-[icon=inline-end]` / `inline-start` selectors in `badgeVariants` should continue to work but verify the icon-only case specifically for the mobile "Done" badge. Implement the variants to pass.

**Do NOT:** Create a new `status-badge.tsx` one-off — extending `Badge` is the instruction. Do not override `border-transparent` or change the badge shape — only add the color variant mappings in the `cva` block.

**Verification:** Tests pass. Inspect dark-mode styles — `success-subtle` uses the darker `success-subtle-foreground` token which is defined for both light and dark modes in `globals.css`.

**Check:** `component-library` (extend, don't fork), `design-system` (semantic token pairs, never hardcoded colors), `superpowers:test-driven-development`.

---

### Task 4 — Fill in `PropertyCreationTopBar`

**What:** Fill in the stub from Task 1 with the real per-step rendering. The component owns all conditional TopBar rendering logic for the entire property-creation flow — the parent wizard never branches on step for the TopBar.

**Why:** Semantic cohesion — the TopBar represents the entire flow and should encapsulate its own per-step rendering. It reads directly from the store (no prop drilling of wizard state), which matches the architecture-wide rule: any component that renders wizard state pulls it from the store via `useWizardState`.

**Where:** `src/app/app/(focused)/p/new/property-creation-top-bar.tsx`.

**Props:** `onExit: () => void` only. (The exit-prompt modal's open state lives in the parent's local React state, not the store — it's a route-level UI concern, not wizard data.) No other props. Everything else comes from the store.

**Store reads via `useWizardState` selectors:**
- `step` — to branch Step 1 vs Step 2 rendering.
- `sectionStates` (only used on Step 2 — guard the selector with a step check to avoid re-renders on Step 1).
- `activeSectionId` (same).

**Store actions via `useWizardActions()`:**
- `goToStep` — Back button on Step 2 calls `goToStep(1)`.

**Behavior per step:**
- **Step 1:** render `<WizardShell.TopBar className="max-w-5xl">` (desktop-wide — stays consistent with Step 2's width so Close position is stable across steps per spec). Contents: no Back (the existing `WizardShell.Back`'s `firstStepOnly` check at `src/components/wizard-shell.tsx:145` already hides it on step 1, so simply not rendering it is sufficient — but because `WizardShell.TopBar` uses grid/flex with three slots, render an invisible spacer `<div />` on the left slot to keep the centered title visually centered); `<WizardShell.StepCount>` rendering the translated title `propertyCreation.checkout.title` centered; `<WizardShell.Close ariaLabel={t('exit')}>` on the right. No progress row.
- **Step 2:** render `<WizardShell.TopBar className="max-w-5xl">` with `<WizardShell.Back label={t('back')} onClick={() => goToStep(1)} />` on the left, `<WizardShell.StepCount>` with the same title centered, `<WizardShell.Close>` on the right. **Below the TopBar**, render a second row inside a `<div className="max-w-5xl mx-auto w-full px-4">` container containing the extended `<StepProgress>` fed with 6 segment states derived from `sectionStates` + `activeSectionId` (see mapping below) and 6 labels (from `CHECKOUT_SECTIONS` + i18n). Pass `hideLabelsOnMobile` (or whatever prop name Task 2 lands on) so labels render only at `md:` and above.

**Segment-state mapping** (pure derivation inside the component, via `useMemo`):
- For each section in `CHECKOUT_SECTIONS` order:
  - If `section.id === activeSectionId` → `'active'` (regardless of underlying `sectionStates[id]` — a completed section being re-edited shows as active in the bar).
  - Else if `sectionStates[id] === 'completed'` → `'done'`.
  - Else if `sectionStates[id] === 'skipped'` → `'skipped'`.
  - Else → `'upcoming'`.
- Exactly one segment may be `'active'` at a time, enforced by the `activeSectionId: SectionId | null` type in the store.

**Fixed to top:** The wizard root is `flex h-full flex-col overflow-hidden pt-8` and the scroll area is `WizardShell.Steps`. Placing `<PropertyCreationTopBar>` as a sibling above `<WizardShell.Steps>` (which is already the parent structure post-Task-1) pins it visually — no additional CSS needed.

**Verification:** Load the wizard at Step 1 (fresh draft URL) and Step 2 (after uploading a file) in a browser — confirm both rows render at Step 2, only the nav row at Step 1, Close position identical across steps, labels visible on desktop, hidden on mobile. Run the type checker and lint.

**Check:** `component-library` (compose existing primitives), `design-system` (spacing between the two rows, tone for the progress container — should be flush with the page background), `frontend-patterns` (selector-based reads with `useMemo` for derived state, minimal props).

---

### Task 5 — Install shadcn Accordion + build `CheckoutAccordion` (TDD for state logic)

**What:** Install the shadcn Accordion primitive and build a reusable `CheckoutAccordion` compound component on top of it, covering all four section states (upcoming / active / completed / skipped), the action bar (Back + Skip + Continue), the completed-summary slot, and a controlled API that lets the parent (`PropertyCheckoutShell`) own the state map.

**Why:** The spec explicitly calls for an accordion container with these four states and a Back/Skip/Continue action bar. Building on shadcn Accordion gives us Radix's accessible open/close primitives and the `type="single"` behavior. Making it generic (not coupled to property creation) means future multi-section flows — tenant onboarding in particular — can reuse it.

**Where:**
- Install via `npx shadcn@latest add accordion`. Confirm the installed component lands at `src/components/ui/accordion.tsx` and matches the project's existing shadcn style (no unnecessary customization).
- Create `src/components/checkout-accordion.tsx` with a compound API:
  - `CheckoutAccordion` — controlled root. Props: `activeId` (the currently expanded section), `onActiveChange(id)` (callback when the user taps a section header or the state machine advances), `children` (a series of `CheckoutAccordion.Section` nodes). Renders a `<div>` that wraps the shadcn `Accordion` in `type="single" collapsible={false}` mode (see note below) and feeds it `activeId`. Sections stack with `gap-6` on desktop, `gap-4` on mobile per mockup spacing.
  - `CheckoutAccordion.Section` — takes `id`, `status` (`'upcoming' | 'completed' | 'skipped'`), `isActive` (boolean — derived by the parent from `activeSectionId === id`), `title`, `subtitle?`, `icon` (a lucide icon element), `summary?` (ReactNode, shown only when `status === 'completed'` AND `!isActive`), `children` (the expanded body, rendered only when `isActive`). Internally: renders an `AccordionItem`. The AccordionItem's native header triggers the root's `onActiveChange(id)` — no separate `onReopen` callback. Header contents: an `IconTile` (tone: `primary` when `isActive`; else `success` for completed status; else `muted` for upcoming/skipped), the title (use `SectionLabel` or a plain `<h3>` with design-system typography), optional subtitle (`text-sm text-muted-foreground`), and a trailing status indicator chosen by the `(status, isActive)` pair — when `isActive` show nothing (the expanded body and action bar speak for themselves), else Badge `success-subtle` "Done" + check icon for completed, Badge `secondary` "Skipped" for skipped, and plain muted "Up next" text only for the single upcoming section that is the immediate next step (the parent tells it via a computed `isUpNext` prop). Tap behavior: whether a header is interactive is determined by the parent via the controlled Accordion — upcoming-but-not-next sections get disabled via the `disabled` prop on `AccordionItem` so their triggers don't fire `onValueChange`.
  - `CheckoutAccordion.Summary` — a `<div>` slot with left padding that clears the icon-tile column (the mockup uses ~48px of indent + some gap — derive the exact value from the icon-tile size + header gap to stay in rhythm). Displays the completed-section summary text.
  - `CheckoutAccordion.Actions` — the Back/Skip/Continue action bar. Flex row with `justify-between`, `border-t pt-4 mt-6`. Back anchored left (`ghost` variant `Button`). Skip (optional, shown when `showSkip` prop is true) + Continue anchored right; Skip is `ghost` variant, Continue is `default` (primary). All three use the existing `Button` component at default size.

**Controlled state — tap behavior on a section header:**
The shadcn `Accordion` with `type="single"` natively supports one-open-at-a-time. In controlled mode we pass `value={activeId}` and `onValueChange={onActiveChange}`. Use `collapsible={false}` to prevent tap-to-close on the active item (the user shouldn't collapse the active section to nothing — they advance via Continue/Back or tap another section). The parent `PropertyCheckoutShell` interprets `onActiveChange(newId)`:
- If `newId === activeSectionId` (user tapped the currently-expanded header): ignore.
- Else the section's underlying `sectionStates[newId]` status is unchanged — we only update `activeSectionId = newId`. Because completed/skipped sections retain their status (no prior-state bookkeeping required), re-opening and re-closing them does not flip any progress/summary/CTA calculation.
- Upcoming-but-not-next sections can never reach this handler because their `AccordionItem` is rendered with `disabled`.

**Scroll behavior — defer the actual scroll to the parent:** The spec requires smooth-scroll on Continue/Back (with sticky-bottom-bar offset on mobile) and NO scroll on direct header tap. `CheckoutAccordion` does not own scroll — it emits events. `PropertyCheckoutShell` (Task 6) decides when to scroll the newly active section's header into view. Use `scroll-margin-top` on the section header's DOM node so `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` accounts for the pinned TopBar automatically — set `scroll-margin-top` to a value covering the TopBar's total pixel height (roughly the height of both rows combined — derive from design-system spacing, not a magic pixel number).

**Tests:** `src/components/__tests__/checkout-accordion.test.tsx` covering: (a) each `(status, isActive)` combination renders the right `IconTile` tone + status indicator (active = no badge, completed + not-active = Done badge with check, skipped + not-active = Skipped badge, upcoming + `isUpNext` = muted "Up next" text), (b) tapping an upcoming-not-next header is a no-op (the `AccordionItem` is `disabled`), (c) tapping a completed/skipped/up-next header fires `onActiveChange(id)` on the root, (d) tapping the currently-active header does NOT fire `onActiveChange` (or fires and the parent ignores it — test the documented behavior), (e) the `Summary` slot renders only when `status === 'completed'` AND `!isActive`, (f) the active section's `children` renders only when `isActive`, (g) the action bar shows Skip only when `showSkip={true}`. No browser DOM required — use React Testing Library.

**Verification:** Tests pass. Render the component in Storybook-free mode by loading the Step 2 page after Task 6 wires it; verify visually against both mockups (structure only — tokens and spacing come from design system).

**Check:** `component-library` (compound pattern with named sub-components and `data-slot` attributes, extend don't fork for existing primitives), `design-system` (spacing rhythm, tone for icon tiles, badge tone for each state, action-bar alignment), `frontend-patterns` (controlled component, props ordered stable→reactive→behavioral), `superpowers:test-driven-development`.

---

### Task 6 — Fill in `PropertyCheckoutShell`: pure composition over the store, summary panel, sticky bottom bar, analytics, scroll

**What:** Replace the Task 1 stubs with the full implementation. No state machine logic lives here — it's all in the store (shipped in Task 1). This task wires `CheckoutAccordion` to render from store selectors, builds the real section placeholder bodies whose action bars invoke store actions directly, builds the desktop sticky summary panel (reading from selectors), builds the mobile sticky bottom bar with 6 dots (reading from selectors), handles smooth-scroll on `activeSectionId` changes that originate from transitions (not from direct header taps), fires analytics events, and adds all i18n strings.

**Why:** This is where the user-facing deliverable becomes real — a user can drive the full state machine with placeholder forms. Keeping the shell a pure composition layer (reads via selectors, writes via actions, zero local state for wizard data) is the payoff of the Zustand architecture: every surface renders from the same source of truth and the component tree carries no wiring.

**Where:** `src/app/app/(focused)/p/new/property-checkout-shell.tsx` (primary), `src/app/app/(focused)/p/new/placeholder-section.tsx` (fill in the real action bar), the three `messages/*.json` files. `UploadContract` and `property-creation-wizard.tsx` should already be in their final shape from Task 1 — this task does not touch them.

**`PropertyCheckoutShell` composition:**
- Zero props. Zero local state for wizard data. The only React state in this component is for refs (scroll targets) and for a one-shot analytics mount flag.
- Reads via `useWizardState` selectors:
  - `sectionStates` (for accordion section status + progress + summary panel)
  - `activeSectionId` (for accordion expansion + progress highlight)
  - `path` (for required/optional derivation)
  - `sectionData` (passed down to section bodies — unused in placeholder but wired for future section plans)
- Reads action bag via `useWizardActions()`: `{ completeCurrentSection, skipCurrentSection, goToPreviousSection, openSection }`.
- Derive `requiredSectionIds` from `checkout-sections.ts` + `path` using `useMemo(() => ..., [path])`.
- Derive `ctaEnabled = requiredSectionIds.every(id => sectionStates[id] === 'completed')` via `useMemo`.
- Derive `remainingCount = requiredSectionIds.filter(id => sectionStates[id] !== 'completed').length`.
- Derive `upNextSectionId` (the first section by spec order whose status is `'upcoming'`) for the accordion's `isUpNext` prop.
- Render `<DetailPageLayoutBody>` containing `<DetailPageLayoutMain>` (accordion + mobile bottom bar) + `<DetailPageLayoutSidebar className="md:sticky md:top-6">` (desktop summary panel).

**Accordion wiring:** The `<CheckoutAccordion>` root takes `activeId={activeSectionId}` and `onActiveChange={openSection}` directly — `openSection` is already the primitive the accordion needs (no wrapper). Each `<CheckoutAccordion.Section>` is mapped from `CHECKOUT_SECTIONS`, with `status={sectionStates[id]}`, `isActive={id === activeSectionId}`, `isUpNext={id === upNextSectionId}`, `disabled` derived from `(status === 'upcoming' && id !== upNextSectionId)`. The expanded body renders `<PlaceholderSection sectionId={id} />` followed by a `<CheckoutAccordion.Actions>` bar whose buttons call `goToPreviousSection`, `skipCurrentSection`, `completeCurrentSection` from the action bag. The first section (`property`) hides Back (the TopBar's Back handles step-level navigation back to Step 1). Skip is shown only when that section is not required in the current `path`.

**Section placeholder body** at `src/app/app/(focused)/p/new/placeholder-section.tsx`:
- `PlaceholderSection({ sectionId })` renders a single translated line from `propertyCreation.checkout.placeholders.{sectionId}`. Calm copy — "Coming in a later plan." or similar per section.
- Keep `PlaceholderSection.Skeleton` from Task 1.
- The action bar is rendered by the shell, not by `PlaceholderSection` — keeps the placeholder focused on body content so future per-section components can drop in without changing the action-bar contract.

**Desktop summary panel (inside `DetailPageLayoutSidebar`):** Reference `checkout-flow-v2.html`. Structure: a `Card` (or bare `<aside>` with `cardShellClassName`) containing a header (title from i18n + subtitle rendered via the ICU plural on `remainingCount`), a list of section rows (each row: a dot/check icon per state computed from `sectionStates[id]` + `activeSectionId`, title, optional detail line — detail line is empty in this plan since section data has no shape yet; leave the element in the DOM but render nothing so later per-section plans can fill it in), an `Optional` `Badge variant="secondary"` on skippable sections (tone discipline: muted, not warning), and a footer with the `Create property` button + the disabled-state hint copy. Button is always disabled in this plan (no submit logic), but its styling reflects `ctaEnabled` so the enabled/disabled visual is verifiable.

**Mobile sticky bottom bar:** Reference `mobile-selected.html`. Structure: a `StickyBottomBar` with className `sticky bottom-0 md:hidden`. Contents: a centered row of 6 dots (one per section — colored per state: `bg-primary` solid for the one matching `activeSectionId`, `bg-success` for completed, `bg-muted` for upcoming, `bg-secondary` for skipped — all via design-system tokens). Below the dots: a full-width disabled `Button` labeled via the `cta.createWithRemaining` ICU string when `remainingCount > 0`, else `cta.create`. Always disabled in this plan.

**Smooth-scroll behavior (handled via store subscription, not callback wiring):**
- Direct-tap scrolls are NOT wanted (spec: tapping a completed/skipped header does not scroll; the user is already looking at it).
- Transition scrolls ARE wanted (Continue/Back/Skip scroll the newly active section into view with TopBar offset).
- Both originate from the same `activeSectionId` change in the store, but transitions are initiated by action calls from inside the shell, while taps are initiated by `openSection` being passed to the accordion's `onValueChange`. To distinguish them: the shell wraps each transition action in a small local handler that (a) calls the store action then (b) sets a local ref `shouldScrollOnNextActiveChange = true`. Then a `useEffect` listening on `activeSectionId` checks the ref: if true, call `scrollIntoView` on the new section's header node, then clear the ref. If false (direct tap), no scroll.
- Section header nodes are registered via a `Map<SectionId, HTMLElement>` kept in a `useRef` — each `<CheckoutAccordion.Section>` exposes its trigger node via a ref callback prop. Use `scroll-margin-top` on the header node (via a Tailwind utility like `scroll-mt-32`) so `scrollIntoView({ behavior: 'smooth', block: 'start' })` clears the pinned TopBar.
- When the final section is completed and `activeSectionId` becomes `null`, scroll to the summary-panel / mobile CTA area instead of a section. The shell owns this decision.

**Analytics events (fired from the shell using `posthog.capture`):**
- `property_checkout_entered` — fired once on first mount via a `useEffect(() => { ...; }, [])` gated by a `useRef(false)` flag. Properties: `{ path }`.
- `property_checkout_section_completed` — fired inside the shell's Continue handler (the wrapper around `completeCurrentSection`) BEFORE the action call. Properties: `{ section_id: activeSectionId, path }`.
- `property_checkout_section_skipped` — fired inside the shell's Skip handler BEFORE `skipCurrentSection`. Properties: `{ section_id: activeSectionId, path }`.
- `property_checkout_section_reopened` — fired inside the shell's `onActiveChange` wrapper when the incoming id targets a section whose current `sectionStates[id]` is `'completed'` or `'skipped'`. Properties: `{ section_id, previous_status: sectionStates[id], path }`.
- Do NOT instrument per-section form field events — those belong to the per-section plans.
- Put these events in the shell (not the store) because the store must stay UI-agnostic — it has no notion of "was this an initial entry vs a resume" and no direct PostHog coupling.

**i18n:** Write the new `propertyCreation.checkout` subtree in `messages/en.json`, then translate to `pt-BR.json` and `es.json`. Keys at minimum: `title` (e.g., "Setting up your property"), `sections.{id}.title`, `sections.{id}.subtitle`, `placeholders.{id}` ("Coming soon" style copy), `actions.back`, `actions.skip`, `actions.continue`, `status.done`, `status.skipped`, `status.upNext`, `status.optional`, `summary.title` (e.g., "Property setup"), `summary.remaining` (ICU plural: `"{count, plural, =0 {All sections complete} one {1 section remaining} other {# sections remaining}}"`), `cta.create`, `cta.createWithRemaining` (ICU with `remaining` count), `cta.hint`.

**Scroll offset token:** The `scroll-margin-top` value corresponds to the combined height of the TopBar's two rows. Derive from design-system spacing — e.g., a Tailwind utility like `scroll-mt-32`, or a CSS custom property `--checkout-topbar-offset` defined once. Don't measure dynamically.

**Verification:** Load `/app/p/new` in a browser:
1. Upload a contract → auto-advance to Step 2 with 6 sections, first active with placeholder body, TopBar nav + progress + labels on desktop / no labels on mobile. `property_checkout_entered` fires once with `{ path: 'contract' }`.
2. Tap "I don't have a contract" on a fresh draft → advance to Step 2 with `{ path: 'no_contract' }` (section requirements differ — Skip is shown on optional sections).
3. Continue through each section → smooth-scroll to the next section's header with TopBar offset; section state transitions reflected in TopBar progress, mobile dots, desktop summary; `property_checkout_section_completed` fires per Continue.
4. Tap a completed section header → it re-opens as active, previous active collapses, **no scroll occurs**; `property_checkout_section_reopened` fires with `previous_status: 'completed'`.
5. Skip an optional section → marked skipped, next section becomes active, smooth-scroll fires; `property_checkout_section_skipped` event.
6. Reload the page mid-flow → skeleton layout flashes briefly (hydration gate), then resumes at the same section state.
7. Reload mid-extraction → hydration's resume-extraction post-processing forces step back to 1 and extraction auto-retriggers.
8. Confirm CTA remains disabled throughout (spec: no submit logic in this plan) but the visual enabled/disabled state correctly reflects `ctaEnabled` derivation once all required sections are completed.

Run the type checker, full test suite, lint, and `pnpm intl:check` (if the project has an i18n sync check — otherwise manually diff the three locale files to ensure key parity).

**Check:** `frontend-patterns` (selector-based reads, useMemo for derived state, useCallback for handler wrappers, hook ordering, stable action refs), `component-library` (compose DetailPageLayout parts + StickyBottomBar + CheckoutAccordion), `design-system` (dot color tokens, CTA disabled state styling, summary-panel typography and spacing), `analytics` (PostHog event conventions, LGPD — no PII in event properties).

---

### Task 7 — Final verification + code review

**What:** Run the full verification suite and dispatch `superpowers:code-reviewer` to review this plan's changes against the referenced spec sections. Address findings and re-verify.

**Steps:**
1. Run the full verification suite: type checker, full test suite, lint, i18n key-parity check across all three locales.
2. Manually re-test the golden flows in a browser on a mobile viewport AND a desktop viewport:
   - Contract path: upload → auto-advance → walk through all 6 sections → verify state persistence on reload → verify CTA enabled state.
   - No-contract path: tap "I don't have a contract" → walk through required sections (Property + CPF) → skip optional sections → verify CTA enabled state.
   - Navigation: tap completed section re-opens it without scroll; Continue/Back/Skip each scroll smoothly with TopBar offset.
   - State invalidation: artificially set `PROPERTY_CREATION_STATE_VERSION` to `99` in a scratch test (do not commit), reload, confirm the utility discards the stale state and the wizard starts fresh.
3. Dispatch `superpowers:code-reviewer` with the spec sections this plan covers: the Property Checkout Shell spec in full, plus the parent spec's "Flow Overview" and "Wizard Steps §Step 2 only through the accordion-shell lens" sections. Request review against the design-system, component-library, and frontend-patterns skills in addition to the spec.
4. Address any blocking findings. Re-run verification.
5. Do NOT commit. Present the results to the user for browser testing and explicit approval before the final commit.

**Check:** `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.
