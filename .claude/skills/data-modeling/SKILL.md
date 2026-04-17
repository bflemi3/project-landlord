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

## Core Entities (post-pivot long-term rental model)

| Entity | Purpose |
|---|---|
| users | Account holders (landlords, tenants) |
| properties, units | Physical rental properties and their units |
| memberships | User ↔ property relationships with roles |
| **contracts** | Rental contract (LL, tenant, unit, rent, start, end, adjustment date, index, terms) |
| **contract_events** | Adjustments, extensions, terminations — explicit trail on a contract |
| **bank_accounts** | User-connected accounts via Open Finance (Pluggy/Belvo) |
| **bank_transactions** | Raw transactions ingested from Open Finance feeds |
| **dda_registrations** | CPF → Celcoin DDA adhesion records for condo fee discovery |
| providers | Utility/condo providers (country + region scoped) |
| provider_profiles | Ingestion/extraction/validation config for a provider |
| example_documents | Sample bills attached to provider profiles |
| charge_definitions | Recurring charge shape (rent, electric, water, condo, internet) |
| **charge_instances** | A specific month's charge for a specific property |
| recurring_rules | Cadence for charge definitions |
| responsibility_allocations | Who owes what portion of a charge |
| tenant_splits | Roommate-level splits of a tenant's portion |
| **bill_holder** | Per-charge marker — `'landlord' \| 'tenant'` — drives which bank feed we watch |
| source_documents | Raw bills (PDFs, photos, email forwards) |
| extraction_results | Parser output + validation state + human corrections |
| **payment_matches** | Linking table: bank_transactions ↔ charge_instances with confidence + state |
| **monthly_ledger** | Frozen per-property snapshot of each past month's charges + outcomes |
| **reputation_scores** | Per-user rating + component breakdown; updates via events |
| **reputation_events** | Every score-affecting event (on-time payment, resolved dispute, response time) |
| disputes | Tenant-raised issues with charges |
| notifications | In-app + email delivery records |
| audit_events | Mutation log |
| invitations | Landlord → tenant invite flow |

Entities listed **in bold** are new or newly-central in the post-pivot model.

## Key Modeling Rules

- **No statement entities.** The draft/review/publish statement model is gone. The `monthly_ledger` + live billing view replaces it.
- **Charge ownership is per-charge, not per-property.** A property can have rent held by the landlord, utilities held by the tenant, and condo held by the landlord — all on the same tenancy. The `bill_holder` column on charge definitions/instances drives the detection logic.
- **Payment matches are reversible.** Even a high-confidence auto-match must be undoable — no schema that assumes a match is final.
- **Provider profiles are data, not code.** Parser strategy + extraction config + validation config are columns, not hardcoded logic.
- **Extraction failures produce data.** Source document, profile used, failure category, corrections, final approved values — all recorded.
- **Reputation events drive scores.** Don't store derived scores without the event trail that produced them. The score is recomputable.
- **Contracts are append-only logically.** Changes record `contract_events`; original contract is preserved.
- **Monthly ledgers are immutable.** Past months freeze. Corrections to a past month create a correction record — never silently mutate the ledger row.
- **Draft → review → publish is only for provider profiles and contracts, not monthly billing.**

## Audit Triggers

`audit_log_trigger()` logs INSERT/UPDATE/DELETE to `audit_events` with `actor_id`, `old_values`, `new_values` as JSONB.

To add audit logging to a new table:

```sql
create trigger audit_<table_name>
  after insert or update or delete on <table_name>
  for each row execute function audit_log_trigger();
```

Priority tables for audit logging (post-pivot):
- `contracts`, `contract_events`
- `charge_definitions`, `charge_instances`, `responsibility_allocations`, `recurring_rules`
- `payment_matches` (especially reversals)
- `reputation_events`
- `disputes`
- `monthly_ledger` (correction trail)

## RLS Posture

- RLS on every property-scoped and user-scoped table
- Bank transactions and bank accounts are particularly sensitive — access strictly limited to the connecting user
- Reputation visibility: own score always visible; counterparty score visible only in contexts defined by the product (prospective landlord viewing applicant, etc.)

See `security-lgpd` rule for LGPD-driven retention and access rules.
