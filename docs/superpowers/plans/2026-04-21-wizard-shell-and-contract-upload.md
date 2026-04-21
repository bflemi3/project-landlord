# Wizard Shell + Contract Upload (Step 1) — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Replace the pre-pivot property-creation flow with a new contract-driven wizard. Deliver a working `/p/new` route where the landlord drops a contract PDF/DOCX, the server runs `extractContract()`, the result is persisted to IndexedDB, and a read-only review step displays the extracted fields.

**Deliverable:** A landlord can visit `/p/new`, upload a contract (or click "I don't have a contract" — inert stub), see a polished AI-reading loading state while extraction runs, and land on step 2 showing structured extracted data (address, rent, parties, expenses, language, etc.). Exiting via the top-right X prompts to save-for-later or discard; the wizard resumes in-session on re-entry.

**Explicit non-goals (deferred to later plans):** editing extracted fields, Supabase Storage upload of the PDF, `contracts` DB table, manual "no contract" branch, wizard resume from the dashboard, cleanup of any pre-pivot DB RPCs that no longer have callers.

**Spec:** `docs/superpowers/specs/2026-04-16-property-creation-design.md` (Wizard Steps §Step 1, State preservation, Error Handling, plus the "Adapt existing primitives" directive in §Flow Overview)

**Depends on:** Plan 1 (contract extraction engine) — merged in PR #16. `extractContract()` is the library entry point this plan calls server-side.

**Blocks:** Plan 3 (Step 2 — property details with editable fields). Plan 3 consumes the IndexedDB wizard state this plan writes.

**Code review policy:** After completing each task, dispatch `superpowers:code-reviewer` to review the task's changes before moving to the next task. The final task (Task 7) includes a comprehensive code review of the plan's implementation against the spec sections listed above.

**Do not commit during execution.** All work stays uncommitted until the user has tested and approved everything in a browser.

---

## Codebase Context

### Primitives to reuse

- `SlideIn` (`src/components/slide-in.tsx`) — framer-motion wrapper for step transitions, currently lazy-loaded by the old flow. Works; needs a `prefers-reduced-motion` fallback and is otherwise fine.
- `StepProgress` (`src/components/step-progress.tsx`) — segmented top bar. Works; `gap-1.5` is off the 4/8 rhythm per `design-system` and should become `gap-1`.
- `FileUpload` (`src/components/file-upload.tsx`) — drag-drop + preview + clear. Has drifted from the PR #18 design refresh: hardcoded `bg-amber-500/10 text-amber-600 dark:text-amber-400`, control surfaces on `rounded-lg` instead of `rounded-2xl`, icon wells open-coded instead of using the new `IconTile` primitive, and the i18n namespace is bill-specific (`propertyDetail`). All three are addressed in Task 2 because Plan 2 depends on them.
- `PropertyForm` + `CepField` (`src/app/app/(focused)/p/new/steps/`) — left in place, not used in Plan 2. Plan 3 (step 2 property details) will rewire them.

### Editorial primitives (PR #18) to compose in the review screen

- `IconTile` (`src/components/icon-tile.tsx`) — tone-aware icon wells (used in upload slot + file chip + review sections)
- `EyebrowLabel` (`src/components/eyebrow-label.tsx`) — uppercase micro-label
- `SectionLabel` (`src/components/section-label.tsx`) — section heading
- `ListRow` family (`src/components/list-row.tsx`) — card-embedded rows for extracted-field display
- `ResponsiveModal` (`src/components/responsive-modal.tsx`) — used for the exit confirmation (Dialog on desktop, Sheet on mobile)

### Extraction engine (Plan 1)

- Entry point: `extractContract(input: ContractExtractionInput): Promise<ContractExtractionResponse>` at `src/lib/contract-extraction/extract-contract.ts:213`
- Input: `{ fileBuffer, fileType: 'pdf' | 'docx' }`
- Output: discriminated union `{ success: true, data }` or `{ success: false, error: { code } }`
- 12 error codes live in `ContractExtractionErrorCode` in `src/lib/contract-extraction/types.ts` — this plan maps every code to an i18n key with at least one CTA.
- Environment requirement: `ANTHROPIC_API_KEY`. If missing at runtime, `api_key_missing` is returned — this plan surfaces it as a "contact support / try later" fallback in the UI, not as a user-facing secret leak.

### Pre-pivot flow to delete

- `src/app/app/(focused)/p/new/create-property-flow.tsx` — the old 3-step wizard
- `src/app/app/(focused)/p/new/steps/{charges-form,charge-config-sheet,invite-tenants-form,setup-complete}.tsx` — pre-pivot step UIs
- `src/app/app/(focused)/p/new/page.tsx` — re-point to the new wizard entry

Leave alone: `property-form.tsx`, `cep-field.tsx` (consumed by Plan 3). Leave `createProperty` server action + `create_property_with_membership` RPC alone even if they end up with no caller after Plan 2 — Plan 3 will either reuse or replace them in the natural course of building step 2.

### Current i18n layout

Locale files live at `messages/{en,pt-BR,es}.json`. New keys go under a new top-level namespace `propertyCreation` so we don't entangle with `propertyDetail` (bills). All copy added in this plan ships in all three locales.

### PostHog

Analytics hook via `posthog-js` already wired (see `create-property-flow.tsx`). Events added in this plan: `contract_upload_started`, `contract_upload_removed`, `contract_extraction_completed`, `contract_extraction_failed`, `no_contract_path_clicked`, `property_creation_wizard_abandoned` (fired when the exit-prompt "Save for later" action is chosen), `property_creation_wizard_resumed` (fired on re-entry to `/p/new` when IndexedDB state exists). Follow `analytics` skill conventions.

### Libraries to add

- `idb-keyval` (runtime dep) — thin Promise wrapper over IndexedDB, stores Blobs natively, ~1.5 KB. Used by the wizard state persistence utility.

### Spec was updated as part of planning

Two spec clarifications landed alongside this plan (same commit intended when the user commits). Not drift — deliberate alignment:
- §State preservation now allows the persisted wizard state to hold either the raw `Blob` (pre–Storage-upload plan) or a storage pointer (post–Storage-upload plan). Plan 2 uses the `Blob` form.
- §Error Handling table collapsed `scanned_document` + `empty_content` into `no_text_extractable`, matching the engine's 12-code `ContractExtractionErrorCode`.

---

## File Structure

### New files

- `src/lib/wizard-state/index.ts` — generic `idb-keyval`-backed persistence utility (not coupled to property creation)
- `src/lib/wizard-state/__tests__/index.test.ts` — TDD suite for set/get/clear + Blob round-trip
- `src/components/wizard-shell.tsx` — reusable composable: `WizardShell`, `WizardShell.TopBar`, `WizardShell.Progress`, `WizardShell.Back`, `WizardShell.Close`, `WizardShell.Steps`, `WizardShell.Step`, `WizardShell.ExitPrompt`
- `src/app/app/(focused)/p/new/property-creation-wizard.tsx` — new wizard controller, replaces `create-property-flow.tsx`
- `src/app/app/(focused)/p/new/steps/upload-contract.tsx` — Step 1 UI
- `src/app/app/(focused)/p/new/steps/review-extraction.tsx` — Step 2 read-only review
- `src/app/app/(focused)/p/new/steps/extraction-loading.tsx` — AI-reading loading state (result-skeleton + rotating editorial copy)
- `src/app/app/(focused)/p/new/actions/extract-contract-action.ts` — server action: `FormData` → `extractContract()` → typed response
- `src/app/app/(focused)/p/new/actions/__tests__/extract-contract-action.test.ts` — TDD suite with engine mocked

### Modified files

- `src/components/responsive-modal.tsx` — remove the prop-based `title` / `description` API; add `ResponsiveModal.Header` / `.Title` / `.Description` compound primitives aligned with the design aesthetic (see Task 2)
- `src/components/wizard-shell.tsx` — migrate `WizardShellExitPrompt` to compose the new `ResponsiveModal.Header` / `.Title` / `.Description` (currently uses a raw `<h2>` / `<p>` inside `.Content`)
- `src/components/charge-config-sheet.tsx` — Task 2 call-site migration: `.Header` / `.Title` + `.Content` + `.Footer`, drop `title` prop
- `src/components/user-menu.tsx` — Task 2 call-site migration: `.Header` / `.Title` + scrollable `.Content` + mobile sign-out in `.Footer`
- `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx` — Task 2 call-site migration: same pattern as charge-config-sheet
- `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.test.tsx` — Task 2: the existing `vi.mock('@/components/responsive-modal', …)` stub accepts arbitrary children, so it stays compatible with the new primitives; confirm no rewrite needed during migration
- `src/app/app/(main)/p/[id]/sections/tenants-section.tsx` — Task 2 call-site migration for three modals (`InviteTenantModal`, `TenantDetailModal`, `InviteDetailModal`)
- `src/app/app/(main)/p/[id]/sections/property-info-actions.tsx` — Task 2: add `.Header` + `.Title` above the existing `.Content` + `.Footer`
- `src/components/__tests__/wizard-shell.test.tsx` — Task 2: adjust exit-prompt DOM queries if the `<h2>`/`<p>` pair is replaced by `DialogTitle` / `DialogDescription` under `.Header`
- `src/components/slide-in.tsx` — add `prefers-reduced-motion` fallback (render children without motion when user prefers reduced motion)
- `src/components/step-progress.tsx` — `gap-1.5` → `gap-1`
- `src/components/file-upload.tsx` — replace hardcoded amber utilities with `bg-warning-subtle` + `text-warning-subtle-foreground`; swap inline icon wells for `IconTile`; `rounded-lg` control surfaces → `rounded-2xl`; accept `translations` and `labels` props so callers (contract + bill) pass their own strings without rebinding the `propertyDetail` namespace; keep existing Supabase-upload props optional (Plan 2 does not pass them)
- `src/app/app/(focused)/p/new/page.tsx` — render `<PropertyCreationWizard />` instead of `<CreatePropertyFlow />`
- `messages/en.json`, `messages/pt-BR.json`, `messages/es.json` — add `propertyCreation.*` namespace (step labels, upload copy, 12 error-code messages with CTAs, exit prompt copy, rotating loading lines); add modal titles/descriptions introduced by Task 2 under the appropriate existing namespaces (`settings`, `propertyDetail`, `properties`, `propertyDetail.tenants`, etc.) where a Title key does not yet exist

### Deleted files

- `src/app/app/(focused)/p/new/create-property-flow.tsx`
- `src/app/app/(focused)/p/new/steps/charges-form.tsx`
- `src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx`
- `src/app/app/(focused)/p/new/steps/invite-tenants-form.tsx`
- `src/app/app/(focused)/p/new/steps/setup-complete.tsx`

---

## Tasks

### Task 1: Scaffold `WizardShell` primitive + new `/p/new` route + exit prompt

**What:** Build a reusable `WizardShell` composable (compound component pattern per `component-library` skill — named sub-components, not prop soup) and rewire `/p/new` to use it. Delete the pre-pivot flow. The wizard renders with a working top bar (progress + X + back), a stubbed upload slot, and a working exit prompt that asks "save for later / discard" when the X is tapped. Extraction and review are stubbed until Tasks 4–6.

**Why:** Deliverable-first. Before any extraction wiring, the shell must exist as the skeleton other tasks hang off. Exit behavior is load-bearing UX (the user must trust their progress persists) and belongs with the shell, not tacked on later.

**Where:**
- Create `src/components/wizard-shell.tsx` with the composable API listed in File Structure
- Create `src/app/app/(focused)/p/new/property-creation-wizard.tsx`
- Update `src/app/app/(focused)/p/new/page.tsx` to render the new wizard
- Delete the five pre-pivot files listed in File Structure
- Add `propertyCreation.exitPrompt.*` keys to all three locale files

**Behavior details for `WizardShell`:**
- Compound parts: top bar (back + progress + close), step slots managed via `activeStep` prop, step transition via lazy-loaded `SlideIn` (callers import the shell eagerly; the shell lazy-loads `SlideIn` internally so framer stays out of the initial bundle per `frontend-patterns`)
- First step renders immediately with no animation (spec §Flow Overview); subsequent step changes slide-transition
- Exit prompt opens a `ResponsiveModal` with two actions: "Save for later" (closes modal, navigates to `/app`, leaves IndexedDB state intact) and "Discard" (clears the wizard's IndexedDB state, navigates to `/app`). The discard branch wires into the persistence utility (Task 3); until Task 3 lands, wire a no-op clear callback and hook it up properly in Task 3.
- Exposes a `wizardId` prop (e.g., `property-creation`) so different wizards use different IndexedDB keys
- Accepts `totalSteps`, `currentStep`, `onBack`, `onExit` (primary exit — routes to the prompt), `onDiscard` (clear state + navigate), `onSaveForLater` (navigate, keep state). Keeps the shell dumb: state lives in the caller.

**Copy:** `exitPrompt.title`: "Keep your progress?" / "Guardar seu progresso?" / "¿Conservar tu progreso?" — approximate; finalize during implementation. Body explains that what they've filled in is saved locally and can be resumed later. Primary CTA "Save for later" (not destructive), secondary "Discard" (destructive tone). Follow `design-system` §Status Design for tone mapping (`destructive` only when the user must act destructively — the Discard button).

**TDD:** Not strictly applicable — `WizardShell` is presentational. A small Testing Library test verifying the exit prompt opens on close-button click, both actions fire the right callbacks, and the back button disappears on step 1 is sufficient.

**How to verify:** Run type check + unit tests + lint. Load `/p/new` in a browser — the route renders the shell with a placeholder step-1 card. Clicking the X opens the prompt; both prompt actions navigate to `/app`. Dispatch `superpowers:code-reviewer` against the shell API and deletion scope.

**Check:** `component-library` (compound pattern, `ResponsiveModal`, composition rules), `design-system` (tokens, tone discipline, radius scale), `frontend-patterns` (lazy-load motion, push `'use client'` to leaves, hook ordering)

---

### Task 2: Redesign `ResponsiveModal` primitive + migrate every call site

**What:** The `ResponsiveModal` primitive currently violates the project's composability rules: its root accepts `title` and `description` string props and auto-renders a `DialogHeader` / `SheetHeader`. That's the prop-soup anti-pattern `component-library` explicitly forbids. Drop the prop-based header in favor of new compound primitives — `ResponsiveModal.Header`, `ResponsiveModal.Title`, `ResponsiveModal.Description` — and migrate every call site to the compound API. Also refresh the primitive's visual treatment so it matches the PR #18 / warm-tokens aesthetic. Task 1 already migrated the wizard exit prompt's body to `.Content` + `.Footer`; Task 2 completes the refactor by adding the header primitives and updating every remaining caller.

**Why:** Every other modern primitive in the library (`Card`, `WizardShell`, `PropertyCard`, `ListRow`, `ChargeRow`, `PageHeader`, `EmptyState`, `InfoBox`) is compound. `ResponsiveModal` is the last holdout, and the prop-based API leaks into six call sites, two of which skip the `.Content` / `.Footer` primitives entirely and hand-roll action rows with `<div className="mt-6 space-y-3">`. That inconsistency bleeds into behavior: sticky footers with scroll-aware fade masks only work when the footer is composed, and Radix's a11y contract is satisfied more cleanly when `.Title` is a first-class slot. Plan 2 also uses the wizard's exit prompt; doing the primitive refresh now means every future modal in the app (including modals introduced by later wizard plans) starts on the correct composable foundation.

**Where (primitive):**
- `src/components/responsive-modal.tsx`

**Where (call sites to migrate):**
- `src/components/wizard-shell.tsx` — `WizardShellExitPrompt` currently renders a raw `<h2>` + `<p>` inside `.Content`. Move them into `.Header` / `.Title` / `.Description`.
- `src/components/charge-config-sheet.tsx` — passes `title={title}` (undefined when editing, `chargeName` when adding a preset). Migrate to `.Header` with a conditional `.Title`; move the action buttons (`mt-6 space-y-3`) into `.Footer`; the form body moves into `.Content`.
- `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx` — same pattern as charge-config-sheet: `title` prop driven by edit/fill-missing/ad-hoc branches. Compose `.Header` (with optional `.Title`) + `.Content` (form fields) + `.Footer` (save/remove/cancel buttons + the "save for future" switch card).
- `src/components/user-menu.tsx` — passes `title={t('title')}` plus `className="sm:max-w-2xl"`. Compose `.Header` + `.Title={t('title')}`; wrap the sidebar-plus-content body in `.Content` (so desktop scrolling works correctly on shorter viewports); move the mobile-only "sign out" row into `.Footer` (still hidden on desktop via `md:hidden`).
- `src/app/app/(main)/p/[id]/sections/tenants-section.tsx` — three modals:
  - `InviteTenantModal`: currently has no title (a11y falls back to sr-only `'Dialog'`). Add `.Header` + visible `.Title` using a new i18n key `propertyDetail.inviteTenantTitle`; wrap form fields in `.Content`; move the submit button from `pt-6` into `.Footer`.
  - `TenantDetailModal`: `title={t('tenantTitle')}` → `.Header` + `.Title`. Info card → `.Content`. Remove button → `.Footer`.
  - `InviteDetailModal`: `title={t('pendingInviteTitle')}` → same treatment; resend + cancel actions → `.Footer`.
- `src/app/app/(main)/p/[id]/sections/property-info-actions.tsx` — already composes `.Content` + `.Footer`. Add `.Header` + `.Title` using a new i18n key `propertyDetail.editPropertyTitle`. The `PropertyForm.Name` field stays where it is (it's the editable name input above the scrollable area, not a title).

**Primitive API after refresh:**
- `ResponsiveModal` root props: `open`, `onOpenChange`, `children`, `className`. **Drop** `title` and `description` entirely.
- `ResponsiveModal.Header` — renders `DialogHeader` on desktop and `SheetHeader` on mobile. Accepts `className` and `children`. Default spacing: `pb-4` below the header, title and description separated by `space-y-1`. Not sticky — scrolls with content when `.Content` is long, per current behavior.
- `ResponsiveModal.Title` — wraps Radix `DialogTitle` / `SheetTitle`. Default typography: `text-lg font-semibold text-foreground` (title scale per `design-system`). Accepts `className` so callers can add `sr-only` for visually-hidden titles (covers the old "no title → sr-only fallback" case).
- `ResponsiveModal.Description` — wraps Radix `DialogDescription` / `SheetDescription`. Default typography: `text-base text-muted-foreground`. Optional — do not render a placeholder when omitted.
- `ResponsiveModal.Content` — unchanged from current behavior (scrollable, `[scrollbar-gutter:stable]`, tracks `contentScrollable` via `ResizeObserver`).
- `ResponsiveModal.Footer` — unchanged (sticky, fade mask appears when content is scrollable).
- A11y fallback: Radix requires a `DialogTitle` descendant inside `DialogContent`. If no `ResponsiveModal.Title` is composed, emit a dev-only `console.warn` and render a `<VisuallyHidden><DialogTitle>Dialog</DialogTitle></VisuallyHidden>` so production never crashes with the Radix warning. Do not silently accept missing titles in production — the warning nudges callers to fix composition.
- Desktop `DialogContent` chrome: keep `rounded-card` (token) and `shadow-card`; drop `max-h-[85svh]` default in favor of `max-h-[85dvh]` if supported (fallback to `svh` when `dvh` unsupported — executor's call, keep it boring). Keep the `flex max-h-[…] flex-col overflow-hidden` container so scroll + footer semantics stay intact.
- Mobile `SheetContent` chrome: keep `rounded-t-2xl` (matches design-system's sheet radius guidance), `px-6`, safe-area-aware bottom padding. Refresh: switch from the current bare `<SheetContent>` to composed header padding (`pt-6`) so the sheet top spacing matches desktop.

**Design aesthetic alignment:**
- Titles use the title scale (`text-lg font-semibold`), not a size that competes with body headings inside `.Content`.
- Descriptions use `text-base text-muted-foreground` — readable body scale, not shrunken secondary copy.
- Header / Content / Footer boundaries respect the 4/8 rhythm — `pb-4` between header and content, `pt-6` between content and footer (the fade-mask preserves that visual separation without a hard rule).
- Zero hardcoded Tailwind palette utilities; zero Zinc; every surface uses the semantic token palette.
- Dark mode: existing subtle-pair tokens handle contrast — do not special-case dark mode in the primitive.

**Behavior that must be preserved (regression risk):**
- `ResizeObserver`-driven `contentScrollable` state on `.Content` / `.Footer` still wires through context (fade mask only appears when the content scrolls).
- The `sm:max-w-lg` default + caller `className` override still apply to desktop `DialogContent`.
- The sheet variant still opens from `bottom`, keeps `rounded-t-2xl`, and respects `env(safe-area-inset-bottom)`.
- `useMediaQuery('(min-width: 768px)')` still drives the desktop/mobile branch — do not change the breakpoint.

**Testing:** No new unit tests for the primitive — composition is straightforward and verified by manual walkthrough. Adjust `src/components/__tests__/wizard-shell.test.tsx` only if the exit-prompt DOM queries break (the `<h2>` / `<p>` pair becomes `DialogTitle` / `DialogDescription`). `add-charge-sheet.test.tsx` mocks `ResponsiveModal` with a pass-through stub that accepts arbitrary children, so it stays compatible; other call sites do not have modal-focused tests.

**Copy / i18n additions:**
- `propertyDetail.inviteTenantTitle` — "Invite tenant" / "Convidar inquilino" / "Invitar inquilino" (wording finalized during implementation, follow the `propertyDetail.tenants` namespace tone).
- `propertyDetail.editPropertyTitle` — "Edit property" / "Editar imóvel" / "Editar propiedad".
- No other new strings — the other call sites already have title keys or use a visually-hidden title.

**How to verify:** Type check + unit tests + lint green. Manual walkthrough in a browser (both desktop and mobile viewports) for every migrated modal: the wizard exit prompt, charge config sheet (new + edit), add-charge sheet (new + edit + fill-missing), user settings modal, three tenants modals, and property-info edit modal. Confirm the header spacing feels right, the footer fade mask still appears when content overflows, and no Radix a11y warnings appear in the console. Dispatch `superpowers:code-reviewer` against composability discipline, token discipline, and the API diff surface (every `title=` / `description=` prop is removed app-wide).

**Check:** `component-library` (compound pattern discipline, `ResponsiveModal` catalog entry will need updating post-migration), `design-system` (title / description typography scale, 4/8 rhythm, semantic tokens only, dark-mode neutralization), `frontend-patterns` (hooks discipline, no client-boundary regressions)

---

### Task 3: Refresh `SlideIn`, `StepProgress`, and `FileUpload` to current aesthetic

**What:** Inline dep refresh. Three small, targeted updates so the primitives Plan 2 uses align with PR #18 tokens and the `design-system` / `component-library` rules.

**Why:** These primitives predate the warm-tokens / editorial-primitives refresh and carry hardcoded Tailwind palette utilities, off-rhythm spacing, and a bill-specific i18n coupling. Plan 2 uses all three; per the project's "modify deps as we build the deliverable" policy, refresh happens now — not in a separate follow-up plan.

**Where:**
- `src/components/slide-in.tsx`
- `src/components/step-progress.tsx`
- `src/components/file-upload.tsx`

**`SlideIn` changes:** Respect `prefers-reduced-motion` by bypassing framer and rendering children directly when the user prefers reduced motion. Use `useReducedMotion` from framer-motion or a CSS-media-query hook — executor's call. No API change.

**`StepProgress` changes:** `gap-1.5` → `gap-1`. Nothing else.

**`FileUpload` changes:**
- Replace `bg-amber-500/10 text-amber-600 dark:text-amber-400` (the `hint` pill) with semantic `bg-warning-subtle` + `text-warning-subtle-foreground`
- Replace the inline file-icon well (currently a bespoke `size-12 rounded-lg bg-secondary`) with the `IconTile` primitive (size `lg`, tone `muted`, `FileText` icon)
- Replace the inline action buttons (`size-8 rounded-lg text-muted-foreground`) with the shadcn `Button` primitive, `variant="ghost"` `size="icon"` — matches control-surface rules and `Button` handles icon sizing per `component-library`
- Rework the empty-state dropzone to use `Card variant="dashed"` per the design catalog, keeping the current behavior (click the card to pick a file; drag-drop continues to work via the existing file input wiring)
- Accept a `labels` prop (typed: `dropzone`, `viewing`, `uploaded`, `uploadFailed`, `fileTooLarge`) so callers pass their own strings. Keep the current `useTranslations('propertyDetail')` behavior as a default fallback when `labels` is absent, so existing bill-upload callers don't break until they migrate. Mark the default fallback as deprecated in a one-line JSDoc on the prop — the executor does not refactor existing callers in this plan.

**Regression check:** `FileUpload` has existing callers in the bills/property-detail flow. Grep for imports before changing the API. Any new required prop breaks them; that's why `labels` is optional. Run the existing `file-upload.test.tsx` suite to confirm no regression.

**TDD:** Add tests to `file-upload.test.tsx` for the `labels` override path (custom strings render when provided) and for the warning-token `hint` styling (class is applied, no hardcoded amber utilities remain). Reduced-motion behavior of `SlideIn` is covered by a simple mock of `matchMedia`.

**How to verify:** Run type check + unit tests + lint. Bills/property-detail flow still renders unchanged. Dispatch `superpowers:code-reviewer` against token discipline and API stability.

**Check:** `design-system` (tokens, radius, spacing rhythm), `component-library` (`IconTile`, `Card variant="dashed"`, `Button` primitives), `frontend-patterns` (lazy-load motion)

---

### Task 4: Build reusable wizard state persistence utility with `idb-keyval`

**What:** A generic utility at `src/lib/wizard-state/` for persisting wizard state across navigation, refresh, and in-session exits. Not coupled to property creation — a future tenant-onboarding wizard uses the same utility with a different `wizardId`.

**Why:** Plan 2 stores the extraction result (JSON) and optionally the original `File` as a `Blob` in the browser. Step 5 (upload) writes. Step 6 (review) reads. Exit-prompt "Discard" clears. Dashboard-resume (future plan) reads. IndexedDB is required because localStorage can't hold Blobs.

**Where:**
- `src/lib/wizard-state/index.ts`
- `src/lib/wizard-state/__tests__/index.test.ts`
- `package.json` — add `idb-keyval` runtime dependency via `pnpm add idb-keyval` (do not use npm per project conventions)

**API (described in prose; executor writes the types):**
- `saveWizardState(wizardId: string, state: T): Promise<void>` — writes a JSON-serializable object (plus any nested `Blob` values, which `idb-keyval` stores natively). Stamps `updatedAt` automatically.
- `loadWizardState<T>(wizardId: string): Promise<T | null>` — returns `null` if the key is missing. Throws if IndexedDB is unavailable (tests cover this path).
- `clearWizardState(wizardId: string): Promise<void>` — deletes the key.
- `hasWizardState(wizardId: string): Promise<boolean>` — cheap existence check for the dashboard-resume UI (future plan).
- All functions are no-ops when `window` is undefined (SSR safety — the utility may be imported from client component modules that render server-side too, e.g., shared types).

**Shape of the property-creation state (typed in this file for discovery, consumed by Tasks 5–6):**
- `wizardId: 'property-creation'` — stored as the IndexedDB key
- `version: number` — starts at `1`, bump when the shape changes so stale state is discarded on load
- `currentStep: number`
- `updatedAt: string` (ISO)
- `contractFile: Blob | null` — the raw PDF/DOCX blob (needed to re-upload on final submit in a future plan; optional for this plan)
- `contractFileName: string | null`
- `contractFileType: 'pdf' | 'docx' | null`
- `extractionResult: ContractExtractionResult | null` — the structured output from Plan 1's engine

**TDD first.** Tests to write:
- Round-trip JSON state: save then load → deep equal
- Round-trip with a `Blob` value: save a small `Blob`, load it, read text → matches
- `loadWizardState` returns `null` for an unknown key
- `clearWizardState` removes the key (subsequent load returns `null`)
- `hasWizardState` returns true/false correctly
- `version` mismatch on load → treat as missing (return `null`)
- SSR safety: `saveWizardState` no-ops without throwing when `window` is `undefined` (mock by deleting `window` in the test)
- Concurrent saves with the same `wizardId` don't corrupt state (last-write-wins is acceptable — just verify no crash)

**How to verify:** Run the test suite for `src/lib/wizard-state/__tests__/index.test.ts`. All tests green. Dispatch `superpowers:code-reviewer` against the utility's API + test coverage.

**Check:** `testing` skill (test patterns, vitest conventions)

---

### Task 5: Server action — `extractContractAction`

**What:** A Next.js server action that accepts a `FormData` containing the contract file, calls `extractContract()` from Plan 1, and returns the typed `ContractExtractionResponse` to the client.

**Why:** Extraction must run server-side — the Anthropic API key is server-only. This action is the single choke point between the client-side upload UI (Task 5) and the library engine (Plan 1). Keeping it tightly scoped (no DB writes, no storage writes, no side effects) preserves the "nothing server-side persists in Plan 2" guarantee.

**Where:**
- `src/app/app/(focused)/p/new/actions/extract-contract-action.ts`
- `src/app/app/(focused)/p/new/actions/__tests__/extract-contract-action.test.ts`

**Behavior:**
- Input: `FormData` with a single `file` entry (File/Blob) and a `fileType` string (`'pdf' | 'docx'`)
- Server-side file-size check against `10 * 1024 * 1024` — return `{ success: false, error: { code: 'file_too_large' } }` before reading into memory if possible. (The engine also re-checks, but short-circuiting in the action avoids unnecessary `arrayBuffer()` allocations.)
- If the file entry is missing or not a `File` instance → `{ success: false, error: { code: 'empty_file' } }`
- Read file bytes into an `ArrayBuffer`, wrap in a `Uint8Array`, pass as `fileBuffer` to `extractContract({ fileBuffer, fileType })`
- Return the engine's response verbatim — no transformation, no redaction
- Wrap the engine call in a top-level `try/catch` that maps an uncaught throw to `{ success: false, error: { code: 'extraction_failed' } }` (the engine should never throw, but belt-and-suspenders)

**Telemetry:** No PostHog calls in the action (server-side PostHog requires the Node SDK and that's out of scope here). Client-side telemetry fires in Task 5 after the action resolves.

**TDD first.** Tests mock `extractContract` and assert:
- Happy path: `FormData` with a valid File → engine is called with the right `fileBuffer` + `fileType`, engine's response is returned verbatim
- Missing file entry → returns `{ success: false, error: { code: 'empty_file' } }` without calling the engine
- File >10 MB → returns `file_too_large` without calling the engine
- Engine throws → action returns `extraction_failed` (never propagates the throw)
- Engine returns `{ success: false, error: { code: 'not_a_contract' } }` → action returns it verbatim (no silent coercion)

**How to verify:** Run the action test suite. Dispatch `superpowers:code-reviewer` against the action's narrow contract (no side effects, no DB, no storage).

**Check:** `frontend-patterns` (server actions return typed results, never throw), `testing` skill

---

### Task 6: Step 1 UI — upload + loading state + error mapping

**What:** The contract-upload step. Uses the refreshed `FileUpload` for drag-drop, submits to the server action from Task 4, renders the AI-reading loading state (Option E: skeleton of step 2 + rotating editorial copy) while extraction runs, on success writes state to IndexedDB and advances to step 2, on failure renders a structured error card with an i18n'd message and CTAs.

**Why:** The load-bearing user-facing chunk of Plan 2. All 12 extraction error codes must map to `propertyCreation.errors.<code>` i18n keys in all three locales, with at least one actionable CTA per spec §Error Handling ("never a dead end").

**Where:**
- `src/app/app/(focused)/p/new/steps/upload-contract.tsx`
- `src/app/app/(focused)/p/new/steps/extraction-loading.tsx`
- `messages/en.json`, `messages/pt-BR.json`, `messages/es.json` — add `propertyCreation.upload.*`, `propertyCreation.loading.*` (rotating copy lines), and `propertyCreation.errors.<code>` for every `ContractExtractionErrorCode`

**Upload step behavior:**
- Hero copy introduces the feature ("Upload your rental contract and we'll set up the rest"). Final copy chosen during implementation — follow `design-system` editorial tone (calm, warm, confident — not chatty)
- `FileUpload` accepts PDF + DOCX only (`accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"`). Client-side size + format check before submitting.
- "I don't have a contract" link rendered below the dropzone — visible, styled as a secondary link, **wired as an inert button in Plan 2** (click fires a PostHog event `no_contract_path_clicked` but does not navigate anywhere; display a non-destructive "Coming soon" toast so the user isn't confused). Plan 9 wires the real manual branch.
- On file selection: fire `contract_upload_started` PostHog event with `{ fileType, fileSizeBytes }`
- On submit: call `extractContractAction` with the file; while pending, render `<ExtractionLoading />` (below); on resolve, branch on `response.success`

**Loading state (`ExtractionLoading`) — Option E:**
- Render a skeleton of the step-2 review layout: section headers ("Property", "Rent & dates", "Parties", "Expenses") with ghost rows. Use `animate-pulse` via CSS (no framer) for the shimmer.
- Below the skeleton, a single line of editorial copy rotates through 3–4 phrases on a ~2s interval: `loading.line1` ("Reading your contract."), `loading.line2` ("Finding addresses and dates."), `loading.line3` ("Identifying the parties."), `loading.line4` ("Almost there."). The rotation is decoupled from extraction progress — it's atmospheric, not a progress indicator. Stop rotating and fade out the whole block when the action resolves.
- Respect `prefers-reduced-motion`: no pulse animation, no rotation — render a single static line ("Reading your contract…") under the static skeleton.

**Error mapping:** Every one of the 12 codes in `ContractExtractionErrorCode` maps to a `propertyCreation.errors.<code>` i18n key plus an optional `.cta` key. Required codes and their intent (already specified in the spec §Error Handling — this task turns that table into i18n keys):

| Code | Message intent | CTA |
|---|---|---|
| `file_too_large` | "Your contract is larger than 10 MB." | "Upload a smaller file" |
| `unsupported_format` | "Only PDF and DOCX are supported." | "Choose another file" |
| `corrupt_file` | "We couldn't read this file." | "Try another file" |
| `empty_file` | "This file is empty." | "Choose another file" |
| `no_text_extractable` | "We couldn't find any text — is this a scanned document?" | "Upload a digital version" |
| `password_protected` | "This file is password-protected." | "Remove the password and try again" |
| `unsupported_language` | "We don't support contracts in this language yet." | "Switch to manual setup" (inert in Plan 2 — opens the no-contract toast) |
| `not_a_contract` | "This doesn't look like a rental contract." | "Try another file" |
| `extraction_failed` | "Something went wrong on our side." | "Try again" |
| `extraction_timeout` | "This took longer than expected." | "Try again" |
| `rate_limited` | "We're experiencing high demand." | "Try again in a moment" |
| `api_key_missing` | "We're having trouble reaching our extraction service." | "Try again later" |

All messages in en + pt-BR + es. Follow `design-system` §Copy and `frontend-patterns` — server action returns typed codes, UI maps to keys.

**Error UI:** Use `InfoBox` (`variant="destructive"` for hard errors, `variant="warning"` for user-correctable like `file_too_large` / `no_text_extractable`) with the mapped message and a primary CTA button that re-opens the file picker or (for `unsupported_language`) fires the no-contract path.

**On success:** Fire `contract_extraction_completed` PostHog event with `{ language, fieldCount }` (count of non-null extracted fields). Write state to IndexedDB via `saveWizardState('property-creation', { version: 1, currentStep: 2, contractFile, contractFileName, contractFileType, extractionResult, updatedAt: now })`. Advance the wizard shell to step 2.

**Remove / replace flow (back-navigation from step 2):** When the user is on step 2 and hits back, they return to step 1 with the current file already selected in the `FileUpload` chip. Two subflows:
- **Remove:** tapping the chip's X clears the file and the IndexedDB `extractionResult` + `contractFile` + `contractFileName` + `contractFileType` keys, dropping the user back to an empty dropzone. Fire a `contract_upload_removed` PostHog event.
- **Replace:** picking a new file runs the server action again and overwrites the previous state on success. No explicit confirm prompt — the new extraction simply replaces the old, matching the spec's "removed or replaced → previous data cleared" rule (scoped to client state here since Plan 2 has no server-side persistence).

**TDD:** Component-level. Use Testing Library + mocked server action. Cases:
- Happy path: valid file → action resolves success → state saved (mock `saveWizardState`) → shell `onAdvance` called with step 2
- Error path for each of the 12 codes → correct i18n key rendered → correct CTA shown
- Loading state renders skeleton + rotating copy on pending
- "I don't have a contract" link fires the event + toast without navigating
- `prefers-reduced-motion` → static loading state

**How to verify:** Run unit tests + lint + type check. Manually test in a browser: upload a real PT-BR contract (from Plan 1's fixtures), verify the loading state feels right (~3–7s), the review screen shows populated data. Test error paths by uploading: a PNG (→ `unsupported_format`), an empty file (→ `empty_file`), a non-contract PDF (→ `not_a_contract`). Dispatch `superpowers:code-reviewer` against UX copy, error mapping completeness, and token discipline.

**Check:** `frontend-patterns` (client boundaries, hook ordering, server actions), `design-system` (tone discipline, skeleton matching final layout), `component-library` (`InfoBox`, `IconTile`), `analytics` (PostHog event conventions)

---

### Task 7: Step 2 — read-only review of extracted data

**What:** The post-extraction review step. Loads the extraction result from IndexedDB, renders extracted fields grouped into sections (Property, Rent & Dates, Parties, Expenses), and handles partial/empty values gracefully. Read-only in Plan 2; editing is introduced in Plans 3–6.

**Why:** Closes the loop on Plan 2's deliverable — the landlord can see what the AI found and decide whether to proceed. The read-only form is deliberate: we don't want to commit to an editing UX until the property-details step (Plan 3) defines the editable field pattern.

**Where:**
- `src/app/app/(focused)/p/new/steps/review-extraction.tsx`
- `messages/{en,pt-BR,es}.json` — add `propertyCreation.review.*` keys for section titles and field labels

**Behavior:**
- On mount, read state via `loadWizardState('property-creation')`. If state is missing or `extractionResult` is null → render a recovery state ("We couldn't find your contract data. Start over?") with a CTA that routes back to step 1. This shouldn't happen in the normal flow but handles the edge case where the user deep-links to the route or IndexedDB was cleared between steps.
- Render four sections using `SectionLabel` headers and `Card size="none"` + `List` + `ListRow` (embedded variant) per `component-library` rules:
  - **Property** — address components (street, number, complement, neighborhood, city, state, postal code, country), property type
  - **Rent & dates** — amount + currency (formatted via `AmountDisplay`), due day, `includes` array if present ("bundled with: condo, IPTU"), start date, end date, rent-adjustment details (frequency + method + index/value)
  - **Parties** — landlords list, tenants list. Each party shows name + tax ID + email. Use `IconTile` (tone `muted`) with `User` icon as the row leading element.
  - **Expenses** — list of extracted expenses with type, provider name, provider tax ID
- Null / missing fields render as a muted dash (`—`) per `design-system` §Status Design ("muted for passive states"). Do not omit rows — the landlord should see that a field was *not* extracted, not that it's absent from the UI.
- Footer "Next" button — currently stubbed (no-op that logs a toast "Coming in the next step"). Plan 3 will delete this `review-extraction.tsx` file entirely and replace it with an editable property-details step in the same wizard slot; nothing in this plan needs to survive that refactor except the IndexedDB state shape.
- Footer "Start over" button — clears IndexedDB state and returns to step 1. Explicit destructive action; confirm via the same `ExitPrompt` pattern (or a simpler inline confirm).

**Empty-state handling:** If extraction succeeded but the LLM returned nothing useful (every field null — e.g., the classifier accepted it but extraction failed gracefully), render an `EmptyState` with a warning-toned `IconTile`, body copy "We couldn't extract much from this contract," and a CTA to go back and try a different file.

**TDD:** Component-level tests with seeded IndexedDB state:
- Full extraction → all sections populate with correct data
- Partial extraction (e.g., no expenses) → expenses section renders an empty indicator, other sections populate normally
- All fields null → renders the empty-state card
- Missing state on mount → renders the recovery CTA
- "Start over" clears state and returns to step 1

**How to verify:** Run unit tests + lint + type check. Browser walkthrough: upload the real PT-BR fixture contract, verify all four sections populate correctly (address = Avenida Campeche, rent = R$ 6.300 bundled, landlords = Alex + Daiana, tenants = Brandon). Dispatch `superpowers:code-reviewer` against the section composition, token discipline, and graceful-degradation logic.

**Check:** `component-library` (`SectionLabel`, `EyebrowLabel`, `IconTile`, `ListRow`, `AmountDisplay`, `EmptyState`), `design-system` (muted tone for passive/null values, 4/8 spacing rhythm), `frontend-patterns` (client component at the leaf, no blocking calls)

---

### Task 8: Verification & Code Review

1. **Type, test, lint pass.** `pnpm exec tsc --noEmit` has no new errors in Plan 2 files. `pnpm test` green including the new unit suites. `pnpm lint` green. `pnpm test:llm` not required (no extraction-engine changes).
2. **Manual walkthrough — happy path.** Start the dev server. Visit `/p/new`, upload `src/lib/contract-extraction/__tests__/fixtures/pt-br-real.docx`, watch the loading state for the full extraction duration, confirm the review screen populates with the known expected values (Avenida Campeche, rent R$ 6.300 bundled, two landlords, one tenant). Exit via X, confirm the save/discard prompt. Re-enter `/p/new` after save-for-later; the wizard resumes on step 2 with populated data.
3. **Manual walkthrough — error paths.** Upload a PNG (→ `unsupported_format`), an empty file (→ `empty_file`), a scanned PDF with no text layer from the fixtures (→ `no_text_extractable`), and a non-contract PDF (→ `not_a_contract`). Each error renders the right i18n message and a working CTA.
4. **Manual walkthrough — three locales.** Switch the app locale to `pt-BR` and `es`, repeat the happy path once per locale. Confirm all `propertyCreation.*` keys are translated and no English leaks.
5. **Manual walkthrough — accessibility / reduced motion.** Enable "Reduce motion" in the OS, reload `/p/new`, confirm step transitions and extraction-loading skeleton render statically with no shimmer or slide animation.
6. **Dispatch `superpowers:code-reviewer` with explicit acceptance criteria:**
   - `WizardShell` is a reusable compound primitive, not property-creation-specific. Its API survives a future tenant-onboarding wizard reusing it with a different `wizardId`.
   - All 12 `ContractExtractionErrorCode` values have matching i18n keys in en + pt-BR + es. No user-facing English strings leaked into the pt-BR / es locales.
   - No hardcoded Tailwind palette utilities (`bg-amber-*`, `text-zinc-*`, `bg-rose-*`, etc.) in any file modified or created in this plan. Every surface uses semantic tokens.
   - `FileUpload`'s `labels` prop is the forward path; existing bill-upload callers continue to work via the `propertyDetail` fallback.
   - `SlideIn` respects `prefers-reduced-motion`.
   - `saveWizardState` round-trips `Blob` values losslessly. SSR-safe (no-ops when `window` is undefined).
   - The server action has zero side effects beyond calling `extractContract` and returning the response verbatim (no DB writes, no storage writes, no PostHog calls). Belt-and-suspenders try/catch maps any uncaught throw to `extraction_failed`.
   - Step 1 fires the documented PostHog events (`contract_upload_started`, `contract_upload_removed`, `contract_extraction_completed`, `contract_extraction_failed`, `no_contract_path_clicked`). The wizard shell fires `property_creation_wizard_abandoned` on Save-for-later and `property_creation_wizard_resumed` on re-entry with existing IndexedDB state.
   - Review screen's four sections compose editorial primitives (`SectionLabel`, `IconTile`, `ListRow`) — no open-coded section headers, no inline icon wells.
   - Pre-pivot files are deleted; no dead imports remain.
7. Address any findings and re-verify.

**Do not commit.** Present results for user testing.

---

## Open questions for the executor

The following were deferred from planning — resolve during implementation using codebase conventions or ask the user if ambiguous:

1. **`WizardShell` exit prompt copy** — final wording across en / pt-BR / es. Planning left the intent ("keep your progress saved"); implementation chooses the exact phrasing per `design-system` §Copy.
2. **Loading rotating lines** — exact count (3 vs 4 vs 5) and pacing (~1.8s, 2s, 2.2s?). Start with 3 lines @ 2s, tune if it feels too fast/slow during manual testing.
3. **`FileUpload.labels` default fallback** — keep `propertyDetail` namespace as the zero-config path, or drop the default entirely and require `labels`? Planning recommends keeping the default to avoid a breaking change; raise if a cleaner cut would be preferred.
