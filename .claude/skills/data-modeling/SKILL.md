---
name: data-modeling
description: Database schema design rules including money model, entity relationships, and provider profiles. Use when writing migrations or modifying the data model.
paths:
  - "supabase/migrations/**"
  - "supabase/seed.sql"
  - "src/lib/supabase/**"
---

# Data Modeling Rules

Design for future flexibility — the data model should support later phases without major rework.

## Money Model

All money stored as minor units + currency:
- `amount_minor = 12345` (integer, never float)
- `currency = 'BRL'` (text)

## Key Modeling Rules

- Country-aware model (`country_code` column) even if Brazil-only for now
- Monthly billing first, but don't bake in assumptions blocking future cadence expansion
- Provider invoice profiles stored as data, not hardcoded logic
- Clear distinction between: charge definitions (expected), charge instances (actual this month), statements (published record), source documents (raw bills), payment events, audit history
- Support multiple tenants per property
- Support tenant-side splits without changing landlord obligations
- Preserve published statement history and revisions
- Make extracted data reviewable and correctable
- Draft → review → publish workflow (never auto-publish)

## Provider Invoice Profiles

Include: provider reference, parser strategy, extraction config JSON, validation config JSON, example document reference, versioning metadata, notes.

## Extraction Feedback Loop

Every extraction failure produces: raw document reference, failure category, provider/profile used, corrected values, final validated output.

## Core Entities

users, properties, units, memberships/roles, providers/issuers, provider invoice profiles, example documents, charge definitions, recurring rules, charge instances, responsibility allocations, tenant splits, statements, source documents, payment events, notifications, audit events, invitations, disputes, portfolio summaries (read-only, derived).

## Audit Triggers

`audit_log_trigger()` logs INSERT/UPDATE/DELETE to `audit_events` with `actor_id`, `old_values`, `new_values` as JSONB.

To add audit logging to a new table:
```sql
create trigger audit_<table_name>
  after insert or update or delete on <table_name>
  for each row execute function audit_log_trigger();
```

Currently on: `charge_definitions`, `recurring_rules`, `responsibility_allocations`.
