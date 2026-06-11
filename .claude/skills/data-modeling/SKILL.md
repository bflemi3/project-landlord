---
name: data-modeling
description: Database schema rules — money model, country/currency, entity design, audit triggers. Use when writing migrations or modifying the data model.
paths:
  - "supabase/migrations/**"
  - "supabase/seed.sql"
  - "src/lib/supabase/**"
  - "src/types/database.ts"
---

# Data Modeling

Design for future flexibility. The data model should support later phases (additional countries, currencies, products) without major rework.

## Brazil-First, Multi-Country-Ready

Product flows are optimized for Brazil. The data model is not. Every rule below reflects that: UX ships for BR today, schemas admit more than BR from day one.

- Every entity with jurisdictional semantics carries `country_code` (even if every row is `'BR'` today)
- Payment rails (DDA, PIX, Open Finance connector), tax identifiers (CPF, CNPJ), providers, address formats are modeled as **country-scoped**, not global — adding a second country requires new rows, not schema migrations
- Inflation indices (IPCA for BR) are modeled as named indices the contract can reference, not a single hardcoded column
- Locale-sensitive formatting (dates, currency display, address layout) is driven by user locale, never hardcoded BR assumptions

## Money Model

All money is stored as minor units + currency. No exceptions.

- `amount_minor` — integer, never float
- `currency` — text (`'BRL'` today, others possible)
- Aggregations work in minor units; display conversion happens at the UI layer

Never use floating-point types for money. Never store money without an accompanying currency.

## Core Entities (long-term rental model)

Billing is a **discovery-driven ledger**: bills and payments are discovered (ingestion, DDA, Open Finance) and recorded as instances + payments; the per-month ledger and live current-month view are *derived* from them in the read layer — there is no statements workflow and no stored ledger table. The **Status** column distinguishes what's in the live schema today from what's still planned — check it before referencing a table in code; a `planned` table does not exist yet.

| Entity | Status | Purpose |
|---|---|---|
| profiles | built | Account holders (landlords, tenants); `tax_id`, locale, opt-out |
| properties, units | built | Physical rental properties and their units |
| memberships | built | User ↔ property relationships with roles |
| contracts | built | Rental contract (LL, tenant, unit, start, end, terms) — `20260510120400` |
| rent | built | Rent amount/terms per contract — `20260510120500` |
| charge_definitions | built | Recurring charge shape: `expense_type` + provider linkage + amount behavior (display labels derive — see modeling rules) |
| charge_instances | built | A discovered obligation (bill): definition-linked (NOT NULL), `issued_on`/`due_date`, amount, split percentages — no display name column |
| charge_payments | built | Payments against an instance (`paid_by`, `paid_on`, method); deleting the row unwinds the match |
| charge_instances_with_payment_state | built | View (security_invoker): instances + computed `paid_minor`/`outstanding_minor` for ledger row selection |
| recurring_rules | built | Cadence for charge definitions |
| responsibility_allocations | built | Who holds / owes each portion of a charge (the bill-ownership mechanism) |
| tenant_splits | built | Roommate-level splits of a tenant's portion |
| source_documents | built | Raw bills (PDFs, photos, email forwards) |
| providers | built | Utility/condo providers (country + region scoped); `display_name` is the UI-facing name |
| provider_invoice_profiles | built | Links a charge definition to its provider; parser/extraction-config columns are unused (extraction is LLM-based) |
| provider_requests | built | Missing-provider records from setup; resolve to a `providers` row |
| example_documents | built | Sample bills attached to provider records |
| disputes | built | Tenant-raised issues with charges |
| notifications | built | In-app + email delivery records |
| audit_events | built | Mutation log |
| invitations | built | Landlord → tenant invite flow |
| payment_matches | planned | Linking table: bank_transactions ↔ charge_instances with confidence + reversible state |
| bank_accounts / bank_transactions | planned | Open Finance (Pluggy) connections + ingested transactions |
| dda_registrations | planned | CPF → Celcoin DDA adhesion records for boleto discovery |
| contract_events | planned | Adjustments, extensions, terminations — explicit trail on a contract |
| reputation_scores / reputation_events | planned | Per-user rating + the event trail that produces it |
| bill_holder | planned | Per-charge marker (`'landlord' \| 'tenant'`) driving which bank feed we watch (concept; today handled via responsibility_allocations) |

## Key Modeling Rules

- **The ledger is derived, never stored.** `charge_instances` + `charge_payments` are the source of truth; month groups and the live current-month view are computed in the read layer (`src/data/charges/`). Don't add stored monthly rollups or statement workflows.
- **No stored display strings.** Anything derivable from structured data is derived in the UI, never persisted as a display column — a bill's label is its definition's `expense_type` + linked provider (`ExpenseName` component), not a saved "Type · Provider" string. Anti-example: a `name text` column composed at insert time.
- **Charge ownership is per-charge, not per-property.** A property can have rent held by the landlord, utilities held by the tenant, and condo held by the landlord — all on the same tenancy. Today ownership is modeled via `responsibility_allocations`; the planned per-charge `bill_holder` marker (`'landlord' | 'tenant'`) will drive which bank feed payment detection watches.
- **Payment matches are reversible.** Even a high-confidence auto-match must be undoable — no schema that assumes a match is final. Today a `charge_payments` row *is* the match; deleting it unwinds cleanly.
- **Provider knowledge is data, not code.** Providers are catalog rows (`providers`); extraction is LLM-based and identifies the provider per bill — no per-provider parser logic.
- **Extraction failures produce data.** Source document, identified provider, failure category, corrections, final approved values — all recorded.
- **Reputation events drive scores.** Don't store derived scores without the event trail that produced them. The score is recomputable.
- **Contracts are append-only logically.** Changes record `contract_events`; original contract is preserved.
- **Past months are immutable.** Frozen history is never silently mutated; corrections to a past month create explicit correction records.
- **Draft → review → publish is only for contracts, not monthly billing.**

## Audit Triggers

`audit_log_trigger()` logs INSERT/UPDATE/DELETE to `audit_events` with `actor_id`, `old_values`, `new_values` as JSONB.

To add audit logging to a new table:

```sql
create trigger audit_<table_name>
  after insert or update or delete on <table_name>
  for each row execute function audit_log_trigger();
```

Priority tables for audit logging:
- `contracts`, `contract_events`
- `charge_definitions`, `charge_instances`, `charge_payments`, `responsibility_allocations`, `recurring_rules`
- `payment_matches` (especially reversals)
- `reputation_events`
- `disputes`

## RLS Posture

- RLS on every property-scoped and user-scoped table
- Bank transactions and bank accounts are particularly sensitive — access strictly limited to the connecting user
- Reputation visibility: own score always visible; counterparty score visible only in contexts defined by the product (prospective landlord viewing applicant, etc.)

See `security-lgpd` rule for LGPD-driven retention and access rules.
