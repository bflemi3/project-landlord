# Provider Creation — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Enable engineers to create new providers via tax ID lookup or bill upload, with auto-filled company info.
**Deliverable:** An engineer navigates to `/eng/providers/new`, enters a CNPJ or uploads a bill PDF, sees company info auto-filled, saves, and is redirected to a provider detail shell page. The empty state on `/eng/providers` is also updated to reflect that providers aren't limited to utility companies.
**Spec:** `docs/superpowers/specs/2026-04-14-playground-ui-design.md` — Section 2 (Provider Creation & Modification), Section 8 (Data Model Changes: providers table modifications)
**Depends on:** Plan 3a-1 (eng shell) — complete
**Blocks:** Plan 3a-3 (provider detail content, profile creation)

---

## Codebase Context

**Providers table:** `supabase/migrations/20260318120000_data_model_foundation.sql` — has `id, name, country_code, tax_id, phone, website, logo_url, created_at, updated_at`. Needs three new columns: `display_name text`, `email text`, and `company_cache_id uuid references company_cache(id)`.

**Company cache:** `supabase/migrations/20260413120100_company_cache.sql` — `company_cache` table with `tax_id (unique), legal_name, trade_name, activity_code, activity_description, city, state, source, fetched_at`. Currently missing `phone` and `email` columns — both are available from the CNPJ APIs but not yet captured. The `lookupCnpj()` function in `src/lib/billing-intelligence/identification/cnpj-lookup.ts` handles the cache-first → BrasilAPI → ReceitaWS fallback chain and returns a `CompanyInfo` object. The `CompanyInfo` interface also needs to be extended with `phone` and `email`.

**CNPJ API fields available (verified by hitting live APIs):**
- BrasilAPI: `ddd_telefone_1`, `ddd_telefone_2` (phone), `email`, full address fields. No website.
- ReceitaWS: `telefone` (phone), `email`, full address fields. No website.
- Website is **not available** from either API — it's not part of the Receita Federal registry. Website remains a manual-entry field on the provider form.

**CNPJ extraction from PDFs:** `src/lib/billing-intelligence/extraction/pdf.ts` has `extractTextFromPdf(buffer: ArrayBuffer)` → text. `src/lib/billing-intelligence/identification/cnpj-extract.ts` has `extractCnpjsFromText(text: string)` → validated CNPJ array. Both are tested.

**Server action pattern:** `src/data/properties/actions/create-property.ts` — `'use server'` directive, takes FormData, validates, calls Supabase, returns `{ success, errors?, data? }`. Uses `revalidatePath()`.

**Interactive lookup pattern:** `CepField.tsx` demonstrates debounced lookup with states (`looking`, `found`, `notFound`), AbortController for cancellation, and inline UI feedback. The CNPJ lookup is server-only (`lookupCnpj` uses service role), so it needs a server action wrapper — not a direct client import.

**Form pattern:** Composable form with context-based state sharing (root + parts). `PropertyForm` is the reference implementation. Uses `useTransition` for server action dispatch. Field-level error display from server response.

**Supabase server client:** `src/lib/supabase/server.ts` — `createClient()` returns an awaitable server client with cookie-based auth.

**Empty state:** `src/components/empty-state.tsx` — `{ icon, heading, description, action? }`. Currently on `/eng/providers` with utility-specific copy that needs broadening.

---

## File Structure

| File | Purpose |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_providers_display_name_company_cache.sql` | Add `display_name`, `email`, and `company_cache_id` to providers; add `phone` and `email` to company_cache; add `provider_id` to provider_test_bills; create `test-bills` storage bucket |
| `src/app/eng/providers/[providerId]/page.tsx` | Provider detail shell (redirect target after creation) |
| `src/data/providers/actions/lookup-cnpj.ts` | Server action wrapping `lookupCnpj()` for client-side use |
| `src/data/providers/actions/extract-cnpjs-from-bill.ts` | Server action: PDF buffer → text → CNPJ array |
| `src/data/providers/actions/create-provider.ts` | Server action: validate + insert provider + link company_cache |
| `src/app/eng/providers/new/page.tsx` | New provider form page |
| `src/app/eng/providers/page.tsx` | Updated empty state copy |

---

## Tasks

### Task 1: Migration — add display_name and company_cache_id to providers

**What:** A single migration that makes two sets of changes:

1. **Providers table** — add `display_name text` (nullable), `email text` (nullable), and `company_cache_id uuid references company_cache(id)` (nullable FK). No backfill needed.
2. **Company cache table** — add `phone text` and `email text` (both nullable). These fields are available from the CNPJ APIs (BrasilAPI: `ddd_telefone_1`; ReceitaWS: `telefone`; both: `email`) but aren't currently captured.
3. **Provider test bills table** — add `provider_id uuid references providers(id)` (nullable — existing rows won't have one). A bill always belongs to a provider, and optionally to a profile. This lets bills uploaded during provider creation exist at the provider level before any profile is created. Index on `provider_id`. Backfill existing rows by joining through `profile_id → provider_invoice_profiles.provider_id` if any rows exist.
4. **Storage bucket** — create a `test-bills` storage bucket (private, PDF-only). No existing bucket covers test bills. Follow the pattern from `source-documents` bucket creation in `20260318120000_data_model_foundation.sql`. Add RLS policies: engineers can manage all files, users can upload.

Also update `src/lib/billing-intelligence/identification/cnpj-lookup.ts`:
- Extend the `CompanyInfo` interface with `phone: string | null` and `email: string | null`
- Update `fetchFromBrasilApi()` to map `ddd_telefone_1` → `phone` and `email` → `email`
- Update `fetchFromReceitaWs()` to map `telefone` → `phone` and `email` → `email`
- Update `lookupFromCache()` to read and return the new fields
- Update `saveToCache()` to persist the new fields and track changes in `company_cache_history`

**Why:** The spec requires providers to have a display name and company_cache link. Phone and email are available from the CNPJ APIs but currently discarded — capturing them lets the provider creation form auto-fill these fields too.

**Where:** New migration file in `supabase/migrations/`. Modifications to `src/lib/billing-intelligence/identification/cnpj-lookup.ts`. After creating the migration, run `supabase migration up` (never `db reset`) to apply, then regenerate types with `pnpm supabase gen types --local`.

**How to verify:** Run `supabase migration up` and regenerate types. Run the type checker. Update the existing tests in `src/lib/billing-intelligence/identification/__tests__/cnpj-lookup.test.ts` to cover the new `phone` and `email` fields (mock responses should include them, assertions should verify they're returned). Run the test suite.

**Check:** `database-migrations` (additive, non-destructive), `data-modeling` (entity relationships)

---

### Task 2: Provider detail shell page

**What:** Create `/eng/providers/[providerId]/page.tsx` — a minimal page that displays the provider ID and a placeholder message. This is the redirect target after provider creation. No data fetching, no real content — just enough to confirm the redirect works and the route resolves.

**Why:** The creation form redirects to the provider detail page after save. Without this shell, the redirect is a 404. Real content comes in a future plan.

**Where:** New file `src/app/eng/providers/[providerId]/page.tsx`. Extract `providerId` from `params`. Render a simple layout with the provider ID visible and an `EmptyState` indicating the detail page is under construction.

**How to verify:** Navigate to `/eng/providers/any-uuid` in the browser and confirm it renders inside the eng layout without errors.

**Check:** `component-library` (reuse EmptyState)

---

### Task 3: CNPJ lookup and bill extraction server actions

**What:** Two server actions in `src/data/providers/actions/`:

1. **`lookup-cnpj.ts`** — Takes a tax ID string, validates format, calls `lookupCnpj()` from `src/lib/billing-intelligence/identification/cnpj-lookup.ts`. On success, also queries `company_cache` by `tax_id` to get the cache row `id` (needed so the form can pass `company_cache_id` to the create-provider action). Returns `{ companyInfo: CompanyInfo, companyCacheId: string }` on success, or a structured error on failure (invalid format, lookup not found, network error). Must handle the "not found" case gracefully — this is not an error, it's a valid outcome where the engineer proceeds with manual entry.

2. **`extract-cnpjs-from-bill.ts`** — Takes FormData containing a PDF file, reads it into an ArrayBuffer, calls `extractTextFromPdf()` then `extractCnpjsFromText()`. Returns the array of found CNPJs. If no CNPJs found, returns an empty array with a message (not an error — the engineer can still enter a CNPJ manually).

**Why:** `lookupCnpj()` is server-only (uses service role Supabase client). The form page needs to call these interactively (on CNPJ input or bill upload), not on form submission. Server actions make them callable from the client.

**Where:** New files in `src/data/providers/actions/`. Follow the pattern from `create-property.ts` for return type structure.

**How to verify:** Write tests for both actions — test the CNPJ validation, the happy path return shape, and the graceful failure cases (invalid CNPJ format, empty PDF text, no CNPJs found). Run the type checker and test suite.

**Check:** `frontend-patterns` (server action conventions), `bill-ingestion` (extraction patterns)

---

### Task 4: Create provider server action

**What:** Server action in `src/data/providers/actions/create-provider.ts`. Takes FormData with: `name`, `display_name`, `tax_id`, `country_code`, `email`, `phone`, `website`, `company_cache_id` (optional — absent when lookup failed/skipped), and optionally a `bill_storage_path` and `bill_file_name` (when a bill was uploaded during provider creation). Validates required fields (`name` is required; `tax_id` should be validated if present). Inserts into `providers` table. If a bill was uploaded, inserts into `provider_test_bills` with the new `provider_id`, `profile_id = null`, and `source = 'playground'`. Returns `{ success: true, providerId }` or `{ success: false, errors }`.

**Why:** The form needs a server action to persist the new provider and associate the uploaded bill (if any) at the provider level. The bill sits with `profile_id = null` until a profile is created and claims it.

**Where:** New file `src/data/providers/actions/create-provider.ts`. Use the Supabase server client. Call `revalidatePath('/eng/providers')` to invalidate the providers list cache.

**How to verify:** Write tests for validation (missing name → error, valid data → success shape, bill association when bill_storage_path provided). Run the type checker and test suite.

**Check:** `frontend-patterns` (server action pattern), `security-lgpd` (access control — this action should verify the user is on the engineer allowlist)

---

### Task 5: New provider form page

**What:** Create `/eng/providers/new/page.tsx` — the main deliverable. A form with two entry paths that converge:

**Entry paths (top of form):**
- **Tax ID input field + Lookup button** — always visible. Engineer types the tax ID in whatever format their country uses. A "Lookup" button next to the input triggers the lookup server action when pressed. Shows loading state on the button during lookup. No auto-trigger — the engineer decides when the input is ready. This keeps the UI country-agnostic (tax ID lengths and formats vary by country).
- **Bill upload** — file input accepting PDFs. On upload: (1) upload the file to Supabase Storage (follow the existing `uploadFile` pattern from `src/data/storage/`), (2) trigger the extract-cnpjs action to pull CNPJs from the PDF text. If multiple CNPJs found, show a selection UI (list of CNPJs for the engineer to pick). Once one is selected, triggers the lookup action on that CNPJ. The storage path and file name are passed along to the create-provider action on save, which inserts a `provider_test_bills` row linking the bill to the new provider (with `profile_id = null` — a future profile creation flow will let the engineer link it).

**Form fields (below entry paths):**

Two distinct sections after lookup completes:

1. **Company info from lookup (read-only)** — data from `company_cache`, not editable by the engineer. Displayed as a read-only summary card/section: legal name, trade name, activity code + description, city, state, email. This data can change on future lookups and should not be mutable through the UI. Linked via `company_cache_id` on save. Not shown when lookup fails.

2. **Provider fields (editable)** — these are the actual `providers` table columns. Name, display name, country code (default 'BR'), email, phone, website. Auto-filled where data is available from the lookup (`companyName` → name, `companyName` → display_name as default, `phone` → phone, `email` → email). Website is never available from the APIs — always manual entry. Tax ID shown as read-only (filled from the entry path, not directly editable).

- All editable fields **disabled** until a tax ID is available and lookup has been attempted
- On successful lookup: read-only section appears with company info, editable fields auto-fill and enable
- On failed lookup (not found): no read-only section. Editable fields enable but remain empty — engineer fills manually. Show a non-blocking message like "Company not found in public registries. You can fill in the details manually." Provider is created without a `company_cache_id` link.
- On lookup error (network): show error message, allow retry

**Save button:** Calls the create-provider action. On success, redirects to `/eng/providers/[providerId]`. Disabled while lookup is in progress or required fields are empty.

**Why:** This is the core deliverable — the page where providers enter the system. Both entry paths are essential: tax ID for known companies, bill upload for when the engineer is starting from a document.

**Deferred:** "If originating from a provider request, tax ID may be pre-extracted" — the `provider_requests` table doesn't exist yet. Request-originated pre-fill is a future plan.

**Where:** New file `src/app/eng/providers/new/page.tsx`. Follow the composable form pattern from PropertyForm. Use existing UI components (Input, Button, Select, FileUpload). Bill uploads go to the `test-bills` storage bucket (created in Task 1) using the existing `uploadFile` utility from `src/lib/storage/upload-file.ts`.

**How to verify:** Start the dev server, navigate to `/eng/providers/new`. Test: (1) enter a valid CNPJ → see lookup loading → fields auto-fill, (2) enter an invalid/unknown CNPJ → see graceful "not found" message → fields enable for manual entry, (3) upload a PDF with a CNPJ → see extraction → CNPJ populates → lookup runs → fields fill, (4) upload a PDF with multiple CNPJs → see selection UI, (5) fill and save → redirect to provider detail shell, (6) upload a PDF with no CNPJ → see message, can still enter CNPJ manually.

**Check:** `frontend-patterns` (hooks, forms, data fetching), `design-system` (spacing, typography, visual hierarchy), `component-library` (reuse existing components), `frontend-design:frontend-design` (form design quality)

---

### Task 6: Update empty state copy on providers page

**What:** Update the description in `src/app/eng/providers/page.tsx` to be provider-type-agnostic. The current copy says "utility companies whose bills you extract data from" — providers can be utility companies, condo management companies, insurance companies, or any company that issues bills to tenants. Update to something like "companies whose bills are processed through the billing intelligence pipeline."

**Why:** The current copy incorrectly scopes providers to just utility companies.

**Where:** `src/app/eng/providers/page.tsx`, line 11 — update the `description` prop on EmptyState.

**How to verify:** Navigate to `/eng/providers` and confirm the updated copy displays correctly.

---

### Task 7: Verification & Code Review

**What:**
1. Run the type checker (`pnpm tsc --noEmit`), test suite (`pnpm test`), and linter (`pnpm lint`) — fix any failures.
2. Start the dev server (`pnpm dev`) and manually verify the full flow:
   - Navigate to `/eng/providers` — see updated empty state copy
   - Click "Add provider" → arrive at `/eng/providers/new`
   - Enter a CNPJ → see lookup feedback → fields auto-fill (or graceful failure)
   - Upload a bill PDF → see CNPJ extraction → lookup → auto-fill
   - Save → redirect to `/eng/providers/[id]` detail shell
   - Navigate back to `/eng/providers` — empty state still shows (provider list not built yet, that's a future plan)
3. Dispatch `superpowers:code-reviewer` against spec Section 2 (Provider Creation) and the data model changes.
4. Address any findings, re-run type checker + tests.

**Do not commit** — present results for user testing.
