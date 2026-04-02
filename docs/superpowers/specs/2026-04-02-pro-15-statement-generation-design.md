# PRO-15: Statement Generation and Completeness Warnings — Design Spec

## Overview

Landlords can generate monthly draft statements from charge definitions, review completeness warnings for missing expected charges, and add manual charges (with optional bill uploads) before publishing. This is the landlord-side draft workflow — publishing (PRO-16) and tenant views (PRO-23) are separate issues.

## Scope

### In scope

- Manual statement generation (landlord triggers it)
- Draft statement view with charges, totals, splits
- Completeness warnings for missing expected charges
- Manual charge entry on drafts (ad-hoc and filling missing expected charges)
- Lightweight bill upload attached to manual charges (for transparency, not extraction)
- "Save for next time" flow that creates a charge definition from an ad-hoc charge
- Reusable `DetailPageLayout` component (refactor property detail to use it)
- Analytics: `statement_draft_created`, `statement_viewed`
- Schema change: `source_documents` table `property_id` → `unit_id`

### Out of scope (deferred)

- Scheduled auto-generation (deferred until bill ingestion is in place)
- Draft-ready notifications (not needed with manual trigger)
- Publishing flow (PRO-16)
- Bill extraction (PRO-19)
- Tenant statement view (PRO-23)
- `statement_published` analytics event (PRO-16)

## Design Decisions

### Manual generation, not scheduled

For M1, landlords manually trigger "Generate [Month] Statement" from the property detail page. Auto-generation makes more sense once bill ingestion (M2) can populate variable charges automatically. Manual trigger means the landlord already knows the draft exists — no draft-ready notification needed.

### Period selection: current + previous months

The generate flow defaults to the current month but offers a month picker showing the current month and any previous months that don't already have a statement for that unit. Future months are not available. This handles "getting started" and "missed a month" cases without the edge cases of future statements.

### Variable charges are not auto-generated

`generateChargeInstances` skips definitions where `amountMinor` is null. These appear as completeness warnings ("Gas — missing") with an "Add" action. A zero-amount placeholder in the charges list would be confusing and look like a real charge.

### Bill upload is for transparency, not extraction

When adding a charge, landlords can optionally upload the bill (PDF/image). The amount is still manually entered. This:
1. Lets tenants see the actual bill and usage (PRO-23)
2. Builds a corpus of bills for extraction profile development in M2

The `charge_source` remains `'manual'` because the amount came from human entry, even if a bill is attached.

### Source documents linked to units, not properties

The `source_documents` table changes from `property_id` to `unit_id`. Bills are unit-level artifacts — each unit gets its own electric/water/gas bill. For M2's email ingestion, the landlord assigns the bill to a unit during review before it reaches a statement.

### Dedicated route for statement view

The statement draft lives at `/app/p/[id]/s/[statementId]` — a full-page view, not a modal or inline section. The wireframe shows a full-screen treatment with its own top bar, summary, charge list, and bottom action bar. This also sets up cleanly for PRO-16 (publishing) and PRO-23 (tenant view).

### Reusable detail page layout

A new `DetailPageLayout` compound component extracts the layout pattern shared by the property detail page and the statement page: full-width header, two-column (main + sidebar) on desktop, single column on mobile. The property detail page is refactored to use it.

## Entry Point

The property detail page gets a new **Statements section** per unit (within the `UnitSection`).

**No draft exists for eligible months:**
- CTA card: "Generate [Month Year] Statement" button
- Month picker (current + previous months without existing statements)
- Tapping generates the statement and navigates to the draft view

**Draft already exists:**
- Summary card showing: period, total amount, charge count, "Draft" status badge
- Tapping navigates to the draft view at `/app/p/[id]/s/[statementId]`

## Draft Statement View

Route: `/app/p/[id]/s/[statementId]`

### Mobile layout (single column)

```
┌──────────────────────────────────┐
│  ← Back   April 2026 Statement  │  ← top bar
│           Apt 201 · Rua Augusta  │
│                          [Draft] │  ← status badge
├──────────────────────────────────┤
│  Total due                       │
│  R$ 2.600,00                     │  ← summary card
│  Due April 10, 2026              │
├──────────────────────────────────┤
│  ⚠ 1 expected charge missing     │  ← completeness warning
│  Gas bill hasn't been received   │     (if applicable)
├──────────────────────────────────┤
│  Charges                  [+Add] │
│  ┌────────────────────────────┐  │
│  │ Rent     recurring  R$1800 │  │  ← generated from definition
│  │ Electric manual 📎  R$ 295 │  │  ← manual with bill attached
│  │ Water    manual 📎  R$ 165 │  │
│  │ Condo    recurring  R$ 245 │  │
│  │ Gas      [missing]   [Add] │  │  ← completeness warning row
│  │───────────────────────────│  │
│  │ Total (tenant)    R$2.505 │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Draft created Apr 1 · Edited    │  ← audit note
├──────────────────────────────────┤
│  [ Review & Publish → ]          │  ← bottom bar (dead-end until PRO-16)
└──────────────────────────────────┘
```

### Desktop layout (two-column via DetailPageLayout)

- **Header (full-width):** PageHeader with back link, title, subtitle, status badge
- **Main column:** Completeness warning, charges list with add/edit actions, audit note
- **Sidebar:** Summary card (total, due date, status), "Review & Publish" button

### Charge rows

Each charge instance row shows:
- Charge type icon (mapped from charge type or name)
- Charge name
- Source badge based on how the charge was created:
  - `recurring` — auto-generated from a recurring charge definition
  - `manual` — manually entered, no bill attached
  - `manual` + paperclip icon — manually entered with a bill attached for reference
  - `from bill` — reserved for M2 when amounts are extracted from bills (`charge_source = 'imported'`)
  - `corrected` — extracted from bill but corrected before publish (`charge_source = 'corrected'`)
- Split indicator if not 100% tenant (e.g., "70%")
- Amount (formatted in BRL)
- Edit action (pencil icon or tap the row)

### Missing charge rows

Active charge definitions with no matching instance on this statement:
- Dimmed appearance (reduced opacity)
- "missing" badge
- "Add" action that opens the add-charge sheet with the name pre-filled

## Add Charge Sheet

Opens as a `ResponsiveModal` (bottom sheet on mobile, dialog on desktop).

### Fields

- **Charge name** — pre-filled from definition if adding a missing expected charge, free text for ad-hoc
- **Amount** — manual entry, always required. `R$` prefix, BRL formatting
- **Attach bill** (optional, nudged for variable charges) — file upload for PDF/image. For variable charges, show a callout: "Attaching the bill helps your tenant verify this charge." For rent/recurring, the upload is available but not prominently nudged.

### On save

1. If file attached: upload to `source-documents` bucket, create `source_documents` row with `unit_id`
2. Create `charge_instance` with:
   - `statement_id` from the current draft
   - `charge_definition_id` if filling a missing expected charge, null if ad-hoc
   - `source_document_id` if bill uploaded
   - `charge_source = 'manual'`
   - Split fields copied from the charge definition's responsibility allocations (or default 100% tenant for ad-hoc)
3. Recalculate `total_amount_minor` on the statement
4. If ad-hoc (no `charge_definition_id`): prompt "Save this charge for future statements?" — if yes, create a `charge_definition` (+ `recurring_rule` if applicable) on the unit

### Edit existing charge

Same sheet, pre-filled with current values. Can update amount and attach/replace bill. Cannot change the name of a definition-linked charge.

### Remove charge

Available for manually-added charges on draft statements. Definition-generated charges cannot be removed (they'd just be regenerated).

## DetailPageLayout Component

**File:** `src/components/detail-page-layout.tsx`

Compound component encapsulating the shared layout pattern:

```tsx
<DetailPageLayout>
  <DetailPageLayout.Header>
    {/* Full-width: PageHeader, summary cards, alerts */}
  </DetailPageLayout.Header>
  <DetailPageLayout.Main>
    {/* Primary content column */}
  </DetailPageLayout.Main>
  <DetailPageLayout.Sidebar>
    {/* Secondary column: info cards, actions */}
  </DetailPageLayout.Sidebar>
</DetailPageLayout>
```

**Encapsulates:**
- Outer flex container: `flex h-full flex-col`
- Scroll area: `flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6`
- Max-width constraint: `mx-auto max-w-4xl`
- Two-column split: `md:flex md:gap-8` with main as `flex-1` and sidebar as `md:w-96 md:shrink-0`
- Mobile collapse: sidebar stacks below main with `mt-8 md:mt-0`

**Refactor:** Property detail page updated to use `DetailPageLayout` instead of inline layout markup.

## Schema Changes

### Migration: `source_documents` — replace `property_id` with `unit_id`

```sql
-- Replace property_id with unit_id on source_documents
alter table source_documents drop constraint source_documents_property_id_fkey;
alter table source_documents rename column property_id to unit_id;
alter table source_documents
  add constraint source_documents_unit_id_fkey
  foreign key (unit_id) references units(id) on delete cascade;

-- Update indexes
drop index idx_source_documents_property_id;
create index idx_source_documents_unit_id on source_documents(unit_id);

-- Update RLS policies
drop policy "Members can view source documents" on source_documents;
drop policy "Landlords can upload documents" on source_documents;
drop policy "Landlords can update documents" on source_documents;

create policy "Members can view source documents"
  on source_documents for select using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_member(units.property_id))
  );
create policy "Landlords can upload documents"
  on source_documents for insert with check (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );
create policy "Landlords can update documents"
  on source_documents for update using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );
```

### Code change: `generateChargeInstances`

Skip definitions where `amountMinor` is null:

```ts
// In generateChargeInstances, add filter:
.filter((charge) => charge.amountMinor !== null && charge.amountMinor !== 0)
```

This ensures variable charges without a known amount don't generate zero-amount instances.

## Data Layer

### New server actions

| Action | Purpose |
|---|---|
| `createStatement(unitId, periodYear, periodMonth)` | Creates statement row + generates charge instances. Returns statement ID. |
| `addChargeToStatement(statementId, { name, amountMinor, chargeDefinitionId?, sourceDocumentId? })` | Adds manual charge instance. Copies splits from definition or defaults to 100% tenant. Recalculates statement total. |
| `updateChargeInstance(instanceId, { amountMinor, name? })` | Edits an existing charge on a draft. Recalculates statement total. |
| `removeChargeInstance(instanceId)` | Removes a manually-added charge from a draft. Recalculates statement total. |
| `uploadBillDocument(unitId, file, periodYear, periodMonth)` | Uploads to `source-documents` bucket, creates `source_documents` row. Returns document ID. |
| `saveChargeAsDefinition(unitId, { name, chargeType, amountMinor?, payer, splitMode, ... })` | "Save for next time" — creates charge definition + recurring rule + allocations. |

### New queries/hooks

| Hook | Returns |
|---|---|
| `useStatement(statementId)` | Statement details: status, total, period, currency, timestamps |
| `useStatementCharges(statementId)` | Charge instances with linked source documents and definitions |
| `useUnitStatements(unitId)` | List of statements for a unit (for entry point and period picker) |
| `useMissingCharges(unitId, statementId)` | Active definitions with no matching instance on this statement |

### Statement total recalculation

When charge instances are added, removed, or updated, the mutation action recalculates `total_amount_minor` as the sum of all charge instance `amount_minor` values on the statement.

## Analytics

| Event | Properties | When |
|---|---|---|
| `statement_draft_created` | `{ property_id, unit_id, period_year, period_month }` | Landlord generates a new draft |
| `statement_viewed` | `{ statement_id, viewer_role }` | Any user views a statement |

## Completeness Warnings Logic

**"Expected" means:** An active, non-deleted charge definition exists for the unit whose recurring rule covers this billing period, but no charge instance with a matching `charge_definition_id` exists on the statement.

**Warning triggers:**
- Variable charges (always expected, never auto-generated since `amountMinor` is null)
- Any definition that should have generated an instance but didn't (edge case guard)

**Warning display:**
- Summary alert at top of charges list: "N expected charge(s) missing" with context
- Missing charges as dimmed rows in the charges list with "missing" badge and "Add" action
- Info note: "Missing charges won't block publishing. You can revise the statement later."

**Not a warning:** Ad-hoc charges that have no charge definition. You can't warn about what was never defined.

## Interaction with Future Issues

- **PRO-16 (Publishing):** The "Review & Publish" button on the draft view will navigate to the completeness review screen, then to the publishing confirmation. Until PRO-16 is built, this button is present but routes to the completeness review as a dead-end with a "Publishing coming soon" state.
- **PRO-19 (Bill upload + extraction):** The bills uploaded via the add-charge flow become available for extraction profile development. The `source_documents` table and storage bucket are ready.
- **PRO-23 (Tenant statement view):** The `source_document_id` on charge instances enables tenants to preview the original bill for transparency.
- **PRO-51 (Landlord dashboard):** `useUnitStatements` can feed statement status into the dashboard property cards.
