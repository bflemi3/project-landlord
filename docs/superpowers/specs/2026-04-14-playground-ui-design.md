# Engineering Playground UI — Design Spec

**Date:** 2026-04-14
**Plan:** 3a (Playground UI)
**Branch:** `brandon/phase0-infrastructure-spike`
**Status:** Approved

---

## Overview

The engineering playground is the command center for building and maintaining near-100% accuracy on automated billing intelligence — the core product competency. Every bill that enters the system needs to be correctly identified, extracted, validated, and eventually paid/matched. The playground is where that accuracy gets built, measured, and continuously improved through a feedback loop between users and engineers.

The playground is designed for engineer + AI (Claude) collaboration. Engineers start the process of adding or modifying providers. Claude (via MCP tools, developed incrementally alongside the UI) is the primary builder. In the future, incoming change requests from the application could automatically kick off AI agents that update and improve accuracy proactively, waiting for engineers to verify and validate their completed work.

**Desktop only.** No mobile support needed — engineers access through desktop browsers.

---

## Architecture

**Approach:** Nested route group with shared layout (Next.js App Router). Each section is its own route under `/eng/`. The shared layout renders a fixed left sidebar. URLs are deep-linkable — engineers can share links in Slack or Linear issues.

**Engineer auth:** Middleware gates all `/eng/*` routes. Checks Supabase session + `engineer_allowlist` table (via service role client). Not on allowlist → redirect to `/app`. Not authenticated → redirect to login.

**Supabase client model:** The playground UI uses the standard Supabase client — the same one the rest of the app uses. No dual-client pattern, no separate eng client factory. In local development, the UI hits local Supabase with seed data. In production, the standard env vars point to production Supabase naturally. Auth and data always go through the same Supabase instance.

**MCP as an incremental dependency:** Claude accesses production data through MCP tools, not the UI. MCP tools run server-side with a service role key (`SUPABASE_SERVICE_ROLE_KEY`) to read/write production Supabase. MCP tools are not a separate plan — they are dependencies pulled in by the UI deliverable that needs them, just like migrations or utility functions. Each implementation plan includes only the MCP tools required for that plan's workflow. MCP grows incrementally alongside the UI:

- Provider creation UI → no MCP needed (engineer-driven)
- Profile creation UI → MCP read tools (Claude reads provider, profile, test bills from prod)
- Test cases UI → MCP test tools (Claude runs tests against prod data, writes results back)
- Fixes UI → MCP fix tools (Claude reads fix requests, marks resolved)

This keeps MCP tools grounded in real deliverables rather than speculative infrastructure.

**Production env vars for MCP:** `SUPABASE_PROD_URL` and `SUPABASE_PROD_SERVICE_ROLE_KEY` (optional). When set in `.env.local`, MCP tools connect to production Supabase while the rest of the app uses local Supabase. In production deployment, these are not set — MCP tools fall back to the standard `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, hitting the same production instance as the UI.

---

## Route Structure

```
src/app/eng/
  layout.tsx                                        # Sidebar nav + engineer context
  page.tsx                                          # Redirects to /eng/providers
  providers/
    page.tsx                                        # Provider registry
    new/
      page.tsx                                      # Create new provider
    [providerId]/
      page.tsx                                      # Provider detail (company level)
      new-profile/
        page.tsx                                    # Create new profile
      [profileId]/
        layout.tsx                                  # Profile tabs layout
        overview/
          page.tsx                                  # Profile overview
        test-cases/
          page.tsx                                  # Test cases list
          [caseId]/
            page.tsx                                # Individual test case detail
        pipeline/
          page.tsx                                  # Test lab (identify, extract, validate, match)
  requests/
    page.tsx                                        # Provider requests queue (+ "New request" modal)
    [requestId]/
      page.tsx                                      # Request detail
  fixes/
    page.tsx                                        # Fix requests list (AI work queue)
    [fixId]/
      page.tsx                                      # Fix request detail
  accuracy/
    page.tsx                                        # Accuracy dashboard
  discovery/
    layout.tsx                                      # Discovery tabs layout
    page.tsx                                        # Redirects to /eng/discovery/bank-accounts
    bank-accounts/
      page.tsx                                      # Bank account connectivity & transactions
    boleto-dda/
      page.tsx                                      # DDA placeholder
```

**Sidebar sections:**
- **Providers** — registry + per-provider lab
- **Requests** — provider creation/correction queue (badge: pending count)
- **Fixes** — AI fix queue (badge: open count)
- **Accuracy** — dashboard with trends (badge: failing profiles count)
- **Discovery** — bank account connection & transaction data

Sidebar is fixed left, collapsible. Active section highlighted. Badge counts on Requests, Fixes, and Accuracy for at-a-glance status.

**Badge count derivations:**
- **Requests:** Count of `provider_requests` where `status = 'pending'`
- **Fixes:** Count of `test_fix_requests` where `status = 'open'`
- **Accuracy:** Query `test_runs` for the latest run per active profile, count where `passed = false`

All fetched on layout mount, refreshed on section navigation.

---

## Section 1: Provider Registry & Provider Detail

### Provider Registry (`/eng/providers`)

Table listing all providers (companies):

| Column | Description |
|---|---|
| Provider | Display name |
| Tax ID | Company tax ID |
| Profiles | Count of profiles |
| Categories | Derived from profiles — multiple badges |
| Accuracy | Aggregate weighted accuracy across profiles, threshold status indicator + Sparkline |
| Last Tested | Most recent test run across any profile |

**Weighted accuracy:** Weighted by test case count per profile — profiles with more test cases contribute proportionally more.

**Sorting:** Failing first (red), near-threshold (yellow), healthy (green). Within each tier, lowest accuracy first.

**Filters:** Status (derived from profiles), category, search by name or tax ID.

Click row → navigates to `/eng/providers/[providerId]`.

**Sparkline** in the accuracy column showing trend direction.

### Provider Detail (`/eng/providers/[providerId]`)

Single page (no URL-navigable sub-sections):

- **Company info:** Name, display name, tax ID, country, phone, website, logo. Inline editable. Linked to `company_cache` — expandable "Raw company data" section showing external API data (legal name, trade name, activity code, city, state, source, fetched date).
- **Derived status badge:** Based on profile statuses (any active → active, all draft → draft, all deprecated → deprecated).
- **Derived categories:** Badges from profiles.
- **Open fixes count:** Aggregated across profiles — "5 open fixes across 2 profiles" with link to `/eng/fixes` filtered by this provider.
- **Profiles list table:**

| Column | Description |
|---|---|
| Profile | Display name |
| Region | Geographic region |
| Category | From profile |
| Status | draft/active/deprecated badge |
| Capabilities | Read-only badges (extraction, validation, payment detection) |
| Accuracy | With threshold status indicator + sparkline |
| Test Cases | Count |
| Last Tested | Relative time |

Click profile row → navigates to `/eng/providers/[providerId]/[profileId]/overview`.

### Profile Detail (`/eng/providers/[providerId]/[profileId]/...`)

Tabs in the URL path: `overview`, `test-cases`, `pipeline`.

Breadcrumb: Providers → Enliv → Enliv (Campeche)

#### Overview Tab (`/overview`)

- **Profile metadata:** Display name, region, category (dropdown from `provider_category` enum), status badge with lifecycle controls. "Promote to active" button is disabled when accuracy is below `min_accuracy` — tooltip explains: "Accuracy must meet minimum threshold (X%) to activate. Current: Y%." Enables when threshold is met. "Deprecate" button available for active profiles.
- **Capabilities:** Read-only badges showing what the profile supports. Updated by AI when capabilities are implemented (see Capabilities section below).
- **Notes for AI** (`ai_notes`): Freeform text field. Engineer provides context for Claude: API info, scraping targets, bill format notes, vault secret references. Persistent — lives with the profile.
- **Threshold management:** Editable controls for `min_accuracy`, `auto_accept_threshold`, `review_threshold`. Each has a tooltip explaining what it represents (see Threshold Explanations below). Contextual guidance below based on current accuracy data and test case count. Changes require a reason, logged to `audit_log`.
- **Accuracy trend chart:** `TrendChart` component showing historical test run results. Threshold line overlay. Annotations for threshold changes and capability additions (from `audit_log`).

#### Test Cases Tab (`/test-cases`)

##### List View

Table of all test cases for this profile:

| Column | Description |
|---|---|
| Competency | Badge: identification, extraction, validation, payment matching, invoice discovery |
| Description | Engineer-provided description |
| Source | Adapts by competency: bill file name (extraction/identification), extraction reference (validation), bill + transaction (payment matching), customer tax ID (invoice discovery) |
| Created by | Engineer name or "production_correction" |
| Created | Relative time |
| Last Result | Pass/fail badge from most recent test run |

Filterable by competency. Sortable by any column. Deep linking: `/eng/providers/[providerId]/[profileId]/test-cases/[caseId]` navigates directly to a specific test case.

##### Detail View

Competency-aware layout using the shared `TestCaseLayout` and panel primitives. Dispatches based on the test case's competency:

- **Extraction:** `SourceDataPanel` (PDF viewer) + `ExpectedResultsPanel` (expected field values with per-field pass/fail from last run)
- **Identification:** `SourceDataPanel` (PDF viewer) + `ExpectedResultsPanel` (expected provider match, acceptable confidence range)
- **Validation:** `SourceDataPanel` (extraction result being validated — loaded from `source_data` JSONB) + `ExternalDataPanel` (raw validation source response with metadata: source type, URL, response status, timestamp) + `ExpectedResultsPanel` (passed/failed, which fields should confirm, expected discrepancies)
- **Payment matching:** `SourceDataPanel` (bill summary from `source_data`) + `ExternalDataPanel` (raw transaction data with metadata) + `ExpectedResultsPanel` (expected match result, confidence, matching criteria) — Plan 3b
- **Invoice discovery:** `SourceDataPanel` (customer tax ID from `source_data`) + `ExternalDataPanel` (raw DDA/API response with metadata) + `ExpectedResultsPanel` (expected discovered invoices) — Future

##### Creating a Test Case

Engineer selects the competency first. The creation flow adapts per competency. In all cases: run the pipeline step, review actual results, correct where needed, corrected values become the expected values.

**Extraction:**
1. Upload a new bill PDF or select from existing bills in `provider_test_bills`
2. Run extraction pipeline
3. Review extracted fields — correct any wrong values
4. Add description (e.g., "March 2026 bill" or "Bill with overdue penalty")
5. Save → creates test case with `test_bill_id` set, `source_data` null, `expected_fields` from corrected values

**Identification:**
1. Upload a new bill PDF or select from existing bills
2. Run identification pipeline
3. Review: which provider was matched, confidence score, competing providers
4. Set expected provider match and acceptable confidence range
5. Save → creates test case with `test_bill_id` set, `source_data` null, `expected_fields` with identification expectations

**Validation:**
1. Select a bill and run extraction first (or select from previous extraction results)
2. The extraction result is captured and stored as `source_data` (this is the input to validation — it must be persisted so the test case is reproducible)
3. Run validation pipeline against the extraction result
4. Review: raw external data (API response, scrape result), field confirmations, discrepancies
5. Set expected validation outcome
6. Save → creates test case with `test_bill_id` (optional, if extraction was from a bill), `source_data` storing the extraction result, `expected_fields` with validation expectations

**Payment matching (Plan 3b):**
1. Select a bill (amount, due date, provider) — stored in `source_data`
2. Select or provide transaction data — stored in `source_data`
3. Run matching pipeline
4. Review match result, confidence, criteria used
5. Set expected match result
6. Save → creates test case with `source_data` containing bill summary + transaction data, `expected_fields` with match expectations

**Invoice discovery (Future):**
1. Enter customer tax ID — stored in `source_data`
2. Run discovery pipeline
3. Review returned invoices
4. Set expected discovered invoices
5. Save → creates test case with `source_data` containing tax ID, `expected_fields` with discovery expectations

##### Editing a Test Case

Edit adapts by competency — the form shows the appropriate fields for the test case's competency type:

- **Extraction/Identification:** Can change description, re-upload or swap the source bill, edit expected field values. Can re-run the pipeline against the source bill to see current results vs. expected.
- **Validation:** Can change description, edit the source extraction data in `source_data` (or re-run extraction from a bill to regenerate it), edit expected validation outcomes. Can re-run validation to see current results vs. expected.
- **Payment matching/Invoice discovery:** Can change description, edit `source_data` (bill summary, transaction data, or tax ID), edit expected results. Can re-run the pipeline to compare.

Competency type cannot be changed on an existing test case — the source data and expected fields structures are fundamentally different. To test a different competency with the same bill, create a new test case.

##### Duplicating a Test Case

"Duplicate" action on any test case. Creates a copy with the same source data and expected fields, pre-filled for editing. Useful for creating variations: "same bill, different expected values" (e.g., testing how the parser handles a corrected field) or starting a new competency test case from an existing bill reference.

##### Deleting a Test Case

Standard delete with confirmation. Shows impact: "This will remove 1 test case from accuracy calculations for this profile."

##### Running Tests

**"Run Tests" button:** Executes the test runner for this profile across all competencies that have test cases. Results display:

- **Grouped by competency:** Each competency section shows its test cases and per-field results
- **Per test case:** Pass/fail with expandable detail showing expected vs. actual for each field
- **Competencies with no test cases:** Shown as "No test cases" with a prompt to create one — surfaces coverage gaps rather than hiding them
- **Summary bar:** Total pass/fail across all competencies, overall accuracy percentage with threshold status indicator

Results stored in `test_runs`. The `report` JSONB stores per-test-case results so the UI can show pass/fail for individual cases (the "Last Result" column in the list view reads from the most recent test run's report). If this run causes a previously-passing profile to regress, triggers system request + Slack alert.

**Table rename:** `extraction_test_cases` → `test_cases`, `extraction_test_runs` → `test_runs`. Simple rename migration, no data changes. Existing test runner code updated to use new names. The broader naming reflects that these tables serve all competencies, not just extraction.

#### Pipeline Tab (`/pipeline`)

Ad-hoc testing of the full pipeline for this provider. Four sections, always visible, empty state if the provider doesn't have that capability:

1. **Identify** — Upload or select a bill, run identification. Shows: tax ID found, provider matched, confidence score, competing providers and their scores, why this provider was chosen.
2. **Extract** — Run extraction on identified bill. Shows: all fields with per-field confidence, threshold status indicators.
3. **Validate** — Run validation (if available). Shows: cross-check details, matches/mismatches, validation source info.
4. **Match Payment** — Test payment matching (if available). Shows: match results with confidence reasoning. (Full matching pipeline comes in Plan 3b.)

Each section that isn't available shows: "This profile doesn't have [capability] yet. Add context in Notes for AI to help Claude build it."

Each pipeline section that produces results includes a **"Flag for fix"** button when results are incorrect. Creates a fix request pre-filled with the pipeline's source data, actual result, and raw external response (see Section 4: Fixes).

---

## Section 2: Provider Creation & Modification

### New Provider (`/eng/providers/new`)

Two entry paths:
- **Enter tax ID directly** → system looks up via `cnpj-lookup` (BrasilAPI/ReceitaWS for Brazil) → auto-fills company name, trade name, activity, location → engineer reviews and confirms
- **Upload a bill** → extract tax ID from PDF → lookup → auto-fill. The bill becomes available as the first test bill for the profile.

If originating from a provider request, tax ID may be pre-extracted. Form pre-fills what it can.

**Fields:** Name, display name, country code, tax ID (looked up), phone, website. All fields except tax ID input and bill upload are **disabled** until either a tax ID is entered or a bill is uploaded. Once a tax ID is available (entered directly or extracted from a bill), the system runs the lookup and pre-fills all fields it can from `company_cache`. The engineer reviews, corrects if needed, and saves. Linked to `company_cache` automatically on creation.

**Save** → creates provider record, redirects to provider page.

### New Profile (`/eng/providers/[providerId]/new-profile`)

**Fields:**
- Display name (e.g., "Enliv (Campeche)")
- Region
- Category (dropdown from `provider_category` Postgres enum)
- Thresholds — pre-filled from system defaults, editable with guidance
- Notes for AI — freeform field
- Initial test bill — upload PDF or link from a provider request

**Save** → creates profile in `draft` status, redirects to profile detail page.

### Editing

- Provider company info: inline edit on provider page
- Profile metadata, thresholds, notes: on profile overview tab
- Threshold changes logged to `audit_log` with required reason

### Linking to Requests

When a provider/profile is created from a request, the request's `provider_id`/`profile_id` gets linked and status moves to `in_progress`.

---

## Section 3: Requests Queue

### Route: `/eng/requests`

Unified inbox for all provider-related work requests.

**Request sources (Postgres enum `request_source`):**
- `user_new_provider` — User uploaded a bill for an unsupported provider
- `user_correction` — User corrected an extracted value in the product
- `engineer` — Engineer creates a request proactively from `/eng`
- `system` — Automated alert (accuracy regression)

**Statuses (Postgres enum `request_status`):**
- `pending` — no one has picked it up
- `in_progress` — engineer working on it
- `testing` — parser built/updated, running accuracy tests
- `complete` — accuracy meets threshold, user notified
- `declined` — won't support, with required reason, user notified

**Queue table:**

| Column | Description |
|---|---|
| Source | Badge: "New provider", "Correction", "Engineer", "System" |
| Provider | Provider name if known, "Unknown" for new |
| Requested by | User who triggered it (blank for system) |
| Assigned to | Engineer working on it (blank if unassigned) |
| Created | When the request was created |
| Status | Badge with status |

**Priority sorting:** Corrections on active providers first (bad data for real users), then system alerts, then new provider requests, then corrections on draft providers. Within each tier, oldest first.

**Assignment:** "Assign to me" sets `assigned_to` (constrained to `engineer_allowlist` via FK) and `assigned_at`. Other engineers see who's working on what.

Click row → navigates to `/eng/requests/[requestId]`.

### Request Detail (`/eng/requests/[requestId]`)

Own page with full context:

- **Bill PDF viewer** — the bill associated with this request
- **For corrections:** Diff view showing extracted vs. corrected value, field highlighted
- **Request metadata:** Source, status, requestor, assignee, created date
- **Request notes:** Freeform field — context for engineers AND AI on why this work is needed and what to focus on. Different from profile `ai_notes` (request notes are scoped to this request's lifecycle; AI notes are persistent profile context).
- **Action buttons:** "Assign to me", "Start work" (→ in_progress), "Mark testing", "Complete", "Decline" (requires reason)
- **Link to provider/profile** detail page, or "Create provider" button for new provider requests

### Engineer-Created Requests

Modal on `/eng/requests` (triggered by "New request" button). Fields: tax ID or bill upload, notes. Source pre-set to `'engineer'`.

### System-Generated Requests

Created automatically when a test run causes an active profile to regress (previous run passed, this run failed, no open system request for this profile). Includes: profile link, failing test run details, accuracy before/after. Triggers Slack webhook notification (`SLACK_ENG_WEBHOOK_URL` env var).

### Bill Migration (Future — User-Facing Features)

The user-facing UX for corrections and new provider requests does not exist yet. When built, it needs to:
1. **Correction flow:** User corrects an extracted value → creates `provider_requests` record (source: `user_correction`) → copies bill PDF reference to `provider_test_bills` (source: `production_correction`) → captures field diff (field, original value, corrected value)
2. **New provider flow:** User selects a provider that doesn't exist → creates `provider_requests` record (source: `user_new_provider`) → stores the uploaded bill

See `docs/project/future-user-corrections-ui.md` for detailed requirements.

---

## Section 4: Fixes (AI Work Queue)

### Route: `/eng/fixes`

The engineer-to-AI communication channel. When a test fails and the engineer diagnoses why, they flag it here with context. The AI reads the fix request and has everything it needs to understand and fix the problem.

### Fixes List (`/eng/fixes`)

| Column | Description |
|---|---|
| ID | Short ID for easy reference when telling Claude what to work on |
| Profile | Profile display name (links to profile detail) |
| Competency | Badge: identification, extraction, validation, etc. |
| Engineer Notes | Preview of the engineer's diagnosis |
| Status | open / resolved — badge |
| Related Request | Link to provider request if applicable |
| Created by | Engineer who flagged it |
| Created | Relative time |

**Filters:** Status (open/resolved), profile, competency. Default view: open fixes, newest first.

**Sorting:** Open first, then resolved. Within open: newest first (most recent diagnosis is freshest context).

Click row → navigates to `/eng/fixes/[fixId]`.

### Fix Request Detail (`/eng/fixes/[fixId]`)

Full context page — everything the AI needs to understand and fix the problem:

- **Fix ID** — prominently displayed so the engineer can reference it when talking to Claude
- **Status** — open / resolved, with "Mark resolved" action
- **Engineer notes** — the diagnosis: "Installation number format mismatch — API uses dashes, extraction strips them"
- **Source data panel** — the input to the pipeline step (extraction result, bill PDF, etc.) — snapshot from time of failure
- **Actual result panel** — what the pipeline returned (the wrong answer)
- **Expected result panel** — what it should have returned
- **Raw external data panel** — the raw API response / scrape result with metadata (source type, URL, response status, timestamp) — snapshot from time of failure
- **Related test case** — link to the test case if this fix was flagged from one (nullable)
- **Related provider request** — link if this fix is part of a broader provider request (nullable)
- **Profile link** — direct navigation to the profile detail

All data panels use the same shared `SourceDataPanel`, `ExternalDataPanel`, and `ExpectedResultsPanel` primitives from the test case views.

### Creating a Fix Request

Fix requests are created from two places:

**From a test case failure (test cases tab):**
1. Engineer sees a failing test case
2. Clicks "Flag for fix" on the failing test case
3. System pre-fills: source data, actual result, expected result, raw external response — all from the specific test run
4. Engineer adds diagnosis notes
5. Save → fix request created, linked to the test case and profile

**From an ad-hoc pipeline run (pipeline tab):**
1. Engineer runs identify/extract/validate/match in the pipeline tab
2. Sees incorrect results
3. Clicks "Flag for fix" on the failing pipeline section
4. System pre-fills: source data, actual result, raw external response
5. Engineer sets what the expected result should be and adds diagnosis notes
6. Save → fix request created, linked to the profile (no test case link since this was ad-hoc)

### Engineer → AI Workflow

1. Engineer flags a fix → gets an ID (e.g., `abc-123`)
2. Engineer opens Claude Code: "Fix test_fix_request abc-123"
3. Claude reads the fix request from the DB — source data, actual vs. expected, raw external response, engineer diagnosis
4. Claude fixes the provider code (parser, validator, etc.)
5. Claude re-runs the test (or the engineer re-runs from the UI)
6. If passing → Claude or engineer marks the fix request as resolved
7. If still failing → engineer flags a new fix request with updated notes ("still failing because...")

### Fix Requests Visibility Across the Platform

Fix requests are surfaced contextually throughout the playground:

| Location | What it shows |
|---|---|
| **Sidebar** | Badge with open fix count |
| **`/eng/fixes`** | Full list — the AI work queue |
| **Provider page** | Aggregated count across profiles: "5 open fixes across 2 profiles" |
| **Profile overview tab** | Count for this profile: "3 open fixes" with link to filtered fixes view |
| **Profile test cases tab** | Badge per test case that has open fix requests |
| **Test case detail** | List of fix requests for this test case with status |

---

## Section 5: Accuracy Dashboard

### Route: `/eng/accuracy`

The "are we healthy?" view. Engineers open this and immediately know where attention is needed.

### Tier 1: System Health (top of page)

- Overall weighted accuracy across all active profiles
- Total active profiles / total profiles
- Total test cases
- Open fix requests count (links to `/eng/fixes`)
- System default thresholds (editable — `min_accuracy`, `auto_accept_threshold`, `review_threshold`) with threshold explanations and contextual guidance
- Threshold nearness indicator on the overall accuracy
- `TrendChart`: system-wide accuracy over time with annotations (threshold changes, new profiles, from `audit_log`)

### Tier 2: Provider Table

One row per provider:

| Column | Description |
|---|---|
| Provider | Name |
| Categories | Derived badges |
| Active Profiles | Count |
| Accuracy | Weighted average with threshold indicator + sparkline |
| Last Tested | Most recent test run across profiles |

Sorted: failing first, near-threshold, healthy. Click row → navigates to `/eng/providers/[providerId]` (not inline expand).

### Threshold Management

System defaults editable at bottom of the accuracy page. Profile-level overrides managed on the profile overview tab. No provider-level thresholds — two tiers: system defaults → profile overrides.

**Threshold explanations (tooltip on each):**
- `min_accuracy`: "The minimum test suite accuracy a profile must achieve to be promoted to active. Active profiles that drop below this trigger an engineering alert."
- `auto_accept_threshold`: "Extractions with confidence at or above this value are auto-accepted without human review. Higher = more conservative, fewer auto-accepts."
- `review_threshold`: "Extractions with confidence below this value are marked as failed. Between this and auto-accept = needs human review. Lower = more lenient."

**Contextual guidance** (rendered wherever thresholds are editable):
- Based on current accuracy data, test case count, and threshold history
- Examples: "Accuracy is 99% across 45 test cases — consider raising auto_accept_threshold from 0.90 to 0.92", "Only 3 test cases — keep thresholds conservative until more data"
- **Impact preview** when editing: "Changing auto_accept from 0.90 to 0.85 would auto-accept 12 more extractions from the last 30 days that currently require review"
- Changes require a reason, logged to `audit_log`

### Active Profile Below Threshold

An active profile that drops below `min_accuracy` stays active (users still need bills processed) but is flagged:
- Accuracy dashboard: red indicator, sorted to top
- Provider registry: red accuracy badge
- Profile detail: banner "Accuracy has dropped below minimum threshold"
- Auto-creates a system request (source: `system`) with failing test run details
- Slack webhook notification to engineering channel

---

## Section 6: Discovery

### Route: `/eng/discovery`

Redirects to `/eng/discovery/bank-accounts`. Tabs in the URL path.

### Bank Accounts (`/eng/discovery/bank-accounts`)

Pluggy-powered (abstracted behind a connector-agnostic interface for future swapability).

- **Connect account:** Launch Pluggy Connect widget. Connected accounts listed with: bank name, account type, last synced.
- **Account browser:** Select a connected account:
  - Account balances (current, available)
  - Transaction list with filters: date range, amount range, transaction type, search by description
  - Raw transaction detail: click a transaction → full API response in JSON viewer (collapsible tree with syntax highlighting)
- **Connector info:** Which connector is active (Pluggy), API version, connection status.

For Plan 3, this is a data explorer. Payment matching testing comes in Plan 3b.

### Boleto DDA (`/eng/discovery/boleto-dda`)

Empty state placeholder:
- Heading: "Invoice & Payment Discovery"
- Description: "Discover incoming boletos and payment status via DDA (Débito Direto Autorizado). Boletos registered to a CPF appear here before the user uploads them, enabling proactive billing."
- Implementation notes: "Requires Celcoin integration. Register a CPF → receive incoming boleto webhooks → match to known providers → create or update charge instances."
- Link to Celcoin docs
- Status badge: "Not yet available"

---

## Section 7: Shared Components

### Bill PDF Viewer

Lives in `src/components/` (shared, not eng-specific — usable in user-facing app later). Renders PDF inline using pdf.js or iframe. Accepts a storage path or URL. Optional `highlights` prop for future bounding box overlay (not implemented in Plan 3 — see Future Enhancements).

The side-by-side composition (PDF + extracted fields) is a separate layout component in the eng platform that composes the viewer with other components.

### Threshold Status Utility

Abstracted for consistent visual signals across the platform:

- `useThresholdStatus(value: number, threshold: number, nearPercent?: number)` → `{ status: 'above' | 'near' | 'below', delta: number }`
- `ThresholdBadge` — colored badge with value (for tables, cards)
- `ThresholdText` — inline colored number
- `thresholdColor(status)` — CSS class utility for custom rendering

Three-tier color: green (above), yellow (within 5% of threshold), red (below). Used everywhere accuracy or confidence is displayed. Caller passes the appropriate threshold for the context.

### Threshold Management Component

Reusable across accuracy dashboard (system defaults) and profile overview tab:
- Current value display, edit control
- Threshold explanation tooltip
- Contextual guidance rendered below
- Reason field (required for changes)
- Changes logged to `audit_log`

### Trendline Components

Two separate components, both using Recharts:

- **`Sparkline`** — Small inline chart (~24-32px height). No axes, labels, or interactivity. Color follows threshold status of latest value. Used in: provider registry, provider page profiles list, accuracy dashboard provider table, requests queue (for corrections on existing profiles).
- **`TrendChart`** — Full-size interactive chart. Axes, tooltips, hover details, threshold line overlay, annotations from `audit_log` (threshold changes, capability additions, status transitions). Used in: accuracy dashboard system health section, profile detail overview tab.

### Test Case View Primitives

Reusable building blocks that competency-specific test case views compose from:

- **`SourceDataPanel`** — Renders the primary source data for a test case. Accepts either a PDF (renders bill PDF viewer) or structured data (renders formatted fields). Used by all competencies for the "what are we testing against?" column.
- **`ExternalDataPanel`** — Renders raw external data with metadata header (source type badge, URL if applicable, response status, timestamp). Body renders in JSON viewer. Used by validation, payment matching, and invoice discovery for the "what did the external source return?" column.
- **`ExpectedResultsPanel`** — Renders expected vs. actual results with pass/fail indicators per field. Shows diffs when actual doesn't match expected. Used by all competencies for the "what should the result be?" column.
- **`TestCaseLayout`** — Responsive multi-panel layout that composes the above. Accepts 2 panels (source + expected) or 3 panels (source + external + expected) based on the competency. Handles scrolling and sizing.

Competency views compose these primitives:
- **Extraction:** `TestCaseLayout` with `SourceDataPanel` (PDF) + `ExpectedResultsPanel` (field values)
- **Identification:** `TestCaseLayout` with `SourceDataPanel` (PDF) + `ExpectedResultsPanel` (provider match, confidence)
- **Validation:** `TestCaseLayout` with `SourceDataPanel` (extraction result) + `ExternalDataPanel` (API/scrape response with metadata) + `ExpectedResultsPanel` (passed/failed, field confirmations)
- **Payment matching:** `TestCaseLayout` with `SourceDataPanel` (bill summary) + `ExternalDataPanel` (transaction data with metadata) + `ExpectedResultsPanel` (match result, confidence)
- **Invoice discovery:** `TestCaseLayout` with `SourceDataPanel` (customer tax ID) + `ExternalDataPanel` (DDA/API response with metadata) + `ExpectedResultsPanel` (discovered invoices)

### Empty State Pattern

Consistent component: icon + heading + description + optional action button. Used for: no providers, no test cases, no requests, capabilities not implemented, DDA placeholder.

### JSON Viewer

Collapsible tree view with syntax highlighting. For raw API responses in Discovery. Reusable for any raw-data inspection.

### Loading

Uses existing `PageLoader` (universal loader, not per-page skeletons).

---

## Section 8: Data Model Changes

### Postgres Enums (new)

Types generated automatically via `npx supabase gen types --local`:

```sql
CREATE TYPE request_source AS ENUM ('user_new_provider', 'user_correction', 'engineer', 'system');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'testing', 'complete', 'declined');
CREATE TYPE fix_request_status AS ENUM ('open', 'resolved');
```

Already exist from Plan 1a: `provider_profile_status`, `provider_category`.

### Existing Table: `providers`

Add columns:
- `display_name text` — human-friendly name for UI
- `company_cache_id uuid references company_cache(id)` — link to external tax ID lookup data

### Existing Table: `provider_invoice_profiles`

Add columns:
- `ai_notes text` — Notes for AI freeform field

Already has from previous plans: `category`, `region`, `status`, `capabilities`, `min_accuracy`, `auto_accept_threshold`, `review_threshold`.

### New Table: `provider_requests`

```sql
CREATE TABLE provider_requests (
  id                  uuid primary key default gen_random_uuid(),
  source              request_source not null,
  status              request_status not null default 'pending',
  provider_id         uuid references providers(id),
  profile_id          uuid references provider_invoice_profiles(id),
  test_bill_id        uuid references provider_test_bills(id),
  requested_by        uuid references auth.users(id),
  assigned_to         uuid references engineer_allowlist(user_id),
  assigned_at         timestamptz,
  decline_reason      text,
  correction_field    text,
  correction_original text,
  correction_value    text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

Indexes: `(status, created_at)`, `(profile_id)`, `(provider_id)`, `(assigned_to)`.

RLS:
- Engineers: full access (via `engineer_allowlist`)
- Users: SELECT where `auth.uid() = requested_by` (see own requests)

### New Table: `test_fix_requests`

```sql
CREATE TABLE test_fix_requests (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references provider_invoice_profiles(id),
  test_case_id          uuid references test_cases(id),
  test_run_id           uuid references test_runs(id),
  provider_request_id   uuid references provider_requests(id),
  competency            test_competency not null,
  source_data           jsonb,
  actual_result         jsonb not null,
  expected_result       jsonb,
  raw_external          jsonb,
  engineer_notes        text not null,
  status                fix_request_status not null default 'open',
  created_by            uuid not null references auth.users(id),
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
```

- `test_case_id`: nullable — fix can come from ad-hoc pipeline run (no test case)
- `test_run_id`: nullable — fix from ad-hoc run has no test run record
- `provider_request_id`: nullable — links to a broader provider request if the engineer is working in that context
- `competency`: which competency failed (identification, extraction, validation, etc.)
- `source_data`: snapshot of the pipeline input at time of failure
- `actual_result`: what the pipeline returned (the wrong answer)
- `expected_result`: what it should have returned (nullable if the engineer doesn't know the exact expected value, just that it's wrong)
- `raw_external`: raw API/scrape response with metadata, snapshot from time of failure

Indexes: `(status, created_at)`, `(profile_id)`, `(test_case_id)`, `(provider_request_id)`.

RLS: Engineers only (via `engineer_allowlist`).

### New Table: `system_thresholds`

```sql
CREATE TABLE system_thresholds (
  key         text primary key,
  value       numeric(5,4) not null,
  updated_at  timestamptz not null default now()
);
```

Seeded: `min_accuracy: 0.9500`, `auto_accept: 0.9000`, `review: 0.5000`. Changes logged to `audit_log` with `entity_type: 'system_threshold'`.

### New Table: `audit_log`

```sql
CREATE TABLE audit_log (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  old_value   jsonb,
  new_value   jsonb not null,
  changed_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
```

No FK on `entity_id` (polymorphic — points to profiles, requests, system_thresholds, etc.). Stored as `text` to accommodate both UUID-based entities (profiles, requests) and text-key entities (system_thresholds). Application code always queries with `entity_type` + `entity_id` together.

Indexes: `(entity_type, entity_id, created_at DESC)`, `(entity_type, action, created_at DESC)`, `(changed_by, created_at DESC)`.

Entity types: `profile`, `provider`, `request`, `fix_request`, `system_threshold`.

Actions: `status_change`, `capability_added`, `capability_removed`, `threshold_updated`, `assigned`, `notes_updated`.

### Table Renames

- `extraction_test_cases` → `test_cases`
- `extraction_test_runs` → `test_runs`

Simple `ALTER TABLE RENAME` migration. Must run before `test_fix_requests` table creation (which references the renamed tables). All code referencing the old names updated (test runner, reporter, compare, tests). Generated Supabase types regenerated.

### New Enum: `test_competency`

```sql
CREATE TYPE test_competency AS ENUM (
  'identification', 'extraction', 'validation',
  'payment_matching', 'invoice_discovery'
);
```

### Modifications to `test_cases` (renamed from `extraction_test_cases`)

- `test_bill_id` → **nullable** (not all competencies start from a bill PDF). Validation starts from an extraction result, payment matching from a bill summary + transaction, invoice discovery from a customer tax ID.
- Add `source_data jsonb` — stores the input for the test case when it's not a bill PDF. For extraction/identification this is null (the bill PDF is the source). For validation, stores the extraction result being validated. For payment matching, stores bill summary + transaction data. For invoice discovery, stores customer tax ID.
- `competencies_tested text[]` → replace with single `competency test_competency not null`. One test case tests one competency. The creation flow, detail views, and edit forms are all designed around single-competency test cases. To test multiple competencies on the same bill, create separate test cases. The `default '{extraction}'` on the old column is replaced by an explicit required value.

### Expected Fields Schema Per Competency

The `expected_fields` JSONB structure varies by competency. Documented here for test runner and UI interpretation:

- **Identification:** `{ "identification.providerId": "uuid", "identification.confidence": 0.95 }`
- **Extraction:** `{ "billing.amountDue": 24567, "billing.dueDate": "2026-04-24", "customer.name": "John", ... }` (dot-notation matching `BillExtractionResult` fields)
- **Validation:** `{ "validation.passed": true, "validation.confirmedFields": ["amountDue", "dueDate"], "validation.discrepancies": [] }`
- **Payment matching:** `{ "matching.matched": true, "matching.confidence": 0.92, "matching.criteria": ["cnpj", "amount", "date_window"] }` (Plan 3b)
- **Invoice discovery:** `{ "discovery.invoicesFound": 2, "discovery.invoices": [...] }` (Future)

### Table to Drop: `provider_threshold_history`

Data migrated to `audit_log` format, then table dropped. Existing code updated.

### Triggers

All new tables with `updated_at` get `update_updated_at()` trigger: `provider_requests`, `test_fix_requests`, `system_thresholds`.

### RLS Summary

| Table | Engineers | Users |
|---|---|---|
| `provider_requests` | Full access | SELECT own rows |
| `test_fix_requests` | Full access | No access |
| `system_thresholds` | Full access | No access |
| `audit_log` | Full access | No access |

---

## Section 9: Code Changes to Existing Systems

### Derive Types from Database

The existing manually-defined types in `billing-intelligence/types.ts` must be replaced with types derived from Supabase generated types:

- `ProviderCategory` → `Database["public"]["Enums"]["provider_category"]`
- `ProviderProfileStatus` → `Database["public"]["Enums"]["provider_profile_status"]`

New enums added in Plan 3 (`request_source`, `request_status`, `fix_request_status`, `test_competency`) are automatically available in generated types after running `npx supabase gen types --local`.

All code importing `ProviderCategory` or `ProviderProfileStatus` from `billing-intelligence/types.ts` updated to import from a shared DB types helper (e.g., `src/lib/types/enums.ts` that re-exports from the generated Database type).

**Exceptions:** `TaxIdType` remains a code-level type — it's intentionally open-ended (`(string & {})`) for country extensibility without migrations. Audit log `entity_type` and `action` remain text columns — audit logs benefit from flexibility; new entity types or actions shouldn't require a migration.

### `buildBillExtractionConfidence` (`confidence.ts`)

Currently uses hardcoded threshold values. Update to accept thresholds as parameters — call sites fetch from DB and pass them. Update existing tests in `confidence.test.ts`.

### Provider Threshold History Code

Any code reading/writing `provider_threshold_history` updated to use `audit_log` instead.

### Capabilities Update Utility

Create `updateProfileCapabilities(profileId, capabilities)` — writes to the profile's `capabilities` JSONB via Supabase client. Used by Claude when building providers (programmatic, not through UI). Document the pattern in `src/lib/billing-intelligence/providers/README.md`: "After adding or removing a capability, call `updateProfileCapabilities` to update the DB." A deterministic MCP tool for this will be introduced when the relevant UI deliverable needs it. Plan 5 formalizes it in the Claude skill.

### Test Runner — System Request Creation

After saving a test run where `passed = false` for a previously-passing active profile:
1. Check if an open system request already exists for this profile
2. If not, insert `provider_requests` with source `system`, link to the profile and test run details in notes
3. POST to `SLACK_ENG_WEBHOOK_URL` env var

### Test Runner Updates

The test runner from Plan 2 needs updates to support multi-competency test cases:
- Handle nullable `test_bill_id` — use `source_data` JSONB as input when bill is not the source
- Dispatch to the appropriate pipeline step based on competency (identification, extraction, validation, etc.)
- Compare results against per-competency expected fields schemas
- Update `compare.ts` to handle validation, identification, and future competency field shapes
- Update all tests in `__tests__/` to cover new competency types

### Provider Registry Code

The in-code registry (`providers/registry.ts`) currently hardcodes provider metadata. For Plan 3, it continues to work as-is for the extraction pipeline. The playground UI reads from the DB. Alignment between code modules and DB records happens via MCP tools (introduced incrementally as UI deliverables need them) and production integration in Plan 4.

---

## Section 10: New Dependencies

- **Recharts** — React charting library for `Sparkline` and `TrendChart` components

---

## Section 11: Accuracy vs. Confidence Clarification

Two distinct measurements with different thresholds:

| Concept | What it measures | Scope | Threshold |
|---|---|---|---|
| **Accuracy** | How often the pipeline produces correct results across all competencies | Aggregate across test cases | `min_accuracy` |
| **Confidence** | How confident is this specific extraction | Per individual extraction | `auto_accept_threshold`, `review_threshold` |

- `min_accuracy` gates profile promotion (draft → active) and triggers alerts on regression
- `auto_accept_threshold`: confidence >= this → auto-accept, no human review
- `review_threshold`: confidence < this → failed; between review and auto_accept → needs human review

---

## Future Enhancements (Not in Plan 3)

Captured here for reference, not built:

- **Bounding box extraction and PDF highlight overlay** — Requires positional data from PDF extraction (switch from `pdf-parse` to `pdf.js` or add post-processing). Bill PDF viewer accepts optional `highlights` prop for when this is ready.
- **User-facing correction UX** — Creates provider requests with bill migration. See `docs/project/future-user-corrections-ui.md`.
- **User-facing "provider doesn't exist" flow** — Creates new provider requests. See `docs/project/future-user-corrections-ui.md`.
- **Vault management UI** — For managing provider secrets. Engineers use SQL/Supabase dashboard for now.
- **Payment matching pipeline** — Plan 3b. Matching logic, Pluggy lab interactive testing, match accuracy tracking.
- **Automated AI agents** — Triggered by incoming requests, proactively improve accuracy.
- **Claude skill updates** — Plan 5. Provider development skill includes capability DB updates, proactive validation/payment detection discovery.
- **Scheduled accuracy checks** — Cron job running full test suite periodically, creating system requests for regressions.

---

## Plan Series Context

- **Plan 1 (complete):** Foundation — database, types, utilities, provider system
- **Plan 2 (complete):** Test runner — test cases, accuracy measurement, field comparison
- **Plan 3a (this):** Playground UI + MCP — engineer auth, provider lab, accuracy dashboard, requests queue, discovery. MCP tools are developed incrementally as dependencies of each UI deliverable (not a separate plan). Each implementation plan includes the MCP tools Claude needs to participate in that feature's workflow.
- **Plan 3b (next):** Payment matching pipeline — matching logic, Pluggy lab interactive testing, match accuracy tracking
- **Plan 4:** Production integration — provider requests from users, corrections, notifications, per-provider trust levels
- **Plan 5:** Knowledge base updates — CLAUDE.md, rules, skills (provider development skill, capability management, confidence scoring docs)

---

## Implementation Notes

- Implementation plan ends with a superpowers code review against this spec
- `provider_category` and `provider_profile_status` Postgres enums already exist — no need to recreate
- Provider (company) status is derived from profiles — no status column on `providers` table
- Category on providers is derived from profiles — no category column on `providers` table
- UUIDs used in all routes (no slugs) — internal tool, engineers navigate via UI
- `company_cache` remains separate from `providers` — raw external API data vs. curated engineering data. Linked via `company_cache_id` FK on `providers`

## TODO: External Call Log Visibility

The `external_call_log` table tracks all external API calls (CNPJ lookups, validation scrapes, etc.) with timing, status, and error details. The playground should surface this data somewhere — possibly in the Discovery section, as a debug tool on provider/profile detail pages, or as its own section. Needs design.
