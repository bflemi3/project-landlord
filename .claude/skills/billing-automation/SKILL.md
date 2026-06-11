---
name: billing-automation
description: Billing transparency and payment automation — bill ingestion (DDA + convenio), Open Finance payment detection, monthly ledger, bill ownership, charge transparency, disputes. Use when building any billing, ingestion, payment, ledger, or dispute feature.
paths:
  - "src/**/billing*"
  - "src/**/ingestion*"
  - "src/**/ingest*"
  - "src/**/bill*"
  - "src/**/extract*"
  - "src/**/provider*"
  - "src/**/payment*"
  - "src/**/ledger*"
  - "src/**/dispute*"
  - "src/**/charge*"
---

# Billing Automation

Pillar 1 of the product. Rent is first class; property expenses are second class. The goal is continuous, accurate visibility into what's owed and what's been paid, without manual statements.

## Status

**Built:** the discovery-ledger schema (`charge_instances` = discovered obligations linked to a definition, `charge_payments`, the `charge_instances_with_payment_state` view) and the property page's Bills tab on top of it — Due · Paid · Awaiting summary strip, overdue banner, month-grouped ledger with frozen history (read layer: `src/data/charges/`; spec: `docs/superpowers/specs/2026-06-04-bills-ledger-design.md`).

**Not built:** everything that *feeds* the ledger — bill ingestion/extraction, DDA, Open Finance, payment matching — plus disputes, revenue tracking, and notifications. The bank/DDA tables (`payment_matches`, `bank_accounts`, `bank_transactions`, `dda_registrations`) are planned, not in schema — see the `data-modeling` entity table. Don't assume those tables or flows exist.

## The Live Billing View Replaces the Statement Workflow

There is no landlord-generated monthly statement. No drafts. No publish. No revisions.

Instead, both parties share a **live billing view** — a real-time dashboard of the current month's charges (rent, utilities, condo fee), amounts, due dates, and payment status. It updates automatically as bills are detected and payments are matched. Most months, neither party needs to actively engage — the system works in the background and notifies only when attention is needed.

**Never build a draft/review/publish flow for monthly billing.** That model is gone.

## The Monthly Ledger

Each property has a ledger — the immutable record of each month's charges and their outcomes. The ledger is **derived**, not stored: `charge_instances` + `charge_payments` are the source of truth, and the read layer computes the month groups.

- **Current month** = the live billing view, mutable as bills arrive and payments match
- **Past months** = frozen records, cannot be silently overwritten
- Corrections to a past month must be explicit, preserve history, and surface as a correction event (not a silent mutation)
- **Bills carry no display name.** A row's label derives from its definition — localized `expense_type` word + linked provider — rendered by the `ExpenseName` component. Never persist or parse a composed "Type · Provider" string.

The ledger powers: historical views, landlord revenue aggregation (monthly / yearly / per-contract / per-property), tenant payment history (feeds reputation), dispute resolution, future exports.

## Bill Discovery — Two Completely Separate Paths

Brazil has two billing instruments with different discovery mechanics. Do not conflate them.

| Bill type | Instrument | Examples | Auto-discoverable? | How |
|---|---|---|---|---|
| Condo fees, loans | Boleto bancário | Condo admin | **Yes** | DDA via Celcoin, CPF registration |
| Utilities | Guia de convênio | ENEL, Sabesp, Comgás, Vivo | **No** | Manual: email forward, upload, photo |
| Rent | N/A (contract-defined) | — | **No** | Amount + due date from contract terms |

### Condo fees (DDA path)

- Register the CPF of whoever holds the bill (tenant or landlord) with Celcoin's DDA API
- Receive webhook notifications when new boletos are issued to that CPF
- No bank login required — CPF + signed adhesion term
- Water is often bundled into the condo boleto. Treat the condo fee as one opaque charge — do not attempt to separate water out
- Invoice PDF is optional — DDA gives us amount + due date + payment status. If user forwards the statement to the property's ingestion email, store it for transparency

Barcode scanning is only used for condo fee setup — to capture the administradora's CNPJ during onboarding. Utility charges don't need barcode scanning (provider is derived from address).

### Utilities (convênio path)

- No centralized registry exists for convênio guides — no CPF-based lookup is possible from any provider
- Bill discovery requires manual user action: upload, email forwarding to the property's ingestion email, or photo
- LLM extraction runs on the document (see Extraction below)
- Where a provider offers a web portal with CPF/account lookup, use it as a **validation layer** to confirm extraction accuracy (more reliable than asking users to validate)

### Rent

- Amount and due date come from the contract terms — not from an external bill
- Payment detection still runs via Open Finance (below)

## Extraction (LLM)

Bill extraction is **LLM-based**. The LLM reads the document and produces the provider identity plus the billing fields (amount, issue date, due date). There are no per-provider parser configurations — provider knowledge is data (`providers` rows), not code.

- **Provider identification is part of extraction.** If the bill's provider isn't linked to the charge definition yet, ingestion creates the provider and links it — provider data on definitions is learned over time.
- **Extracted data is never treated as inherently correct.** Validate against the charge definition (expected type, amount behavior) and, where available, the provider's web portal.
- **Extraction failures must produce data.** Every run records: source document reference, identified provider, failure category, corrected values, final approved output.

### Missing providers

Utilities vary by region (Florianópolis electricity = Celesc/Enliv, São Paulo electricity = ENEL, etc.). During property setup, derive utility providers from the address and present them as defaults — user confirms or changes.

If a user's provider isn't in the catalog:

- Record a provider request and alert engineering automatically — ideally a Linear ticket
- Do not block property setup on missing providers — rent works everywhere, expenses degrade gracefully
- A definition without a linked provider displays as its expense-type word alone until ingestion identifies the provider from a real bill

### Ingestion error handling

When extraction fails or produces suspect results, notify both engineering and users:

- **Engineering:** error visibility for debugging
- **Users:** well-thought-out UX explaining what happened and what to do (re-upload, manually enter, wait for fix) — not a generic error state

## Payment Detection — Open Finance

Both the landlord and the tenant connect their bank accounts via Open Finance (OAuth through Pluggy). This gives transaction-level visibility into both sides.

| Account | What we detect | Transaction signal |
|---|---|---|
| Tenant's bank | Tenant paid electric bill | `CONVENIO_ARRECADACAO` debit matching provider CNPJ |
| Tenant's bank | Tenant paid condo fee | `BOLETO` debit matching admin CNPJ |
| Tenant's bank | Tenant sent rent | `PIX`/`TED` debit to landlord's account |
| Landlord's bank | Rent received | `PIX`/`TED` credit from tenant |
| Landlord's bank | Landlord paid a bill in their name | `CONVENIO_ARRECADACAO` or `BOLETO` debit matching provider CNPJ |

### Matching rules

Match transactions to charge instances using provider CNPJ + amount + date window.

- **High-confidence matches** — auto-mark as paid
- **Ambiguous matches** — surface for one-tap user confirmation
- **No match** — charge remains unpaid; keep watching the feed

CNPJ is sometimes absent (batch boleto/convênio payments). Fall back to transaction description text matching before giving up.

### Never treat auto-match as payment truth without a trail

Even auto-matched payments must be reversible. If the user says "this wasn't that bill," the match must unwind cleanly and the charge returns to unpaid. Do not build flows that assume auto-match is final.

## Bill Ownership Flexibility

Bills may be held by either the landlord or the tenant. The platform supports both models on the same property.

- When setting up charges, the landlord indicates who holds each bill (`bill_holder = 'landlord' | 'tenant'`)
- Payment detection follows accordingly — watch the tenant's feed for tenant-held bills, the landlord's feed for landlord-held bills
- If a utility transfers from landlord to tenant mid-contract, update the configuration — detection switches feeds without schema changes

## Charge Transparency

For every charge the tenant sees, surface the source:

- Manual entry
- Imported from bill
- Imported from bill and corrected before display

Where possible, let the tenant:

- Preview the source document
- Understand the amount and reason
- Dispute structured issues cleanly (amount, due date, responsibility)

Avoid forcing trust through opacity. Every charge should be understandable, traceable, and reviewable.

## Disputes

When a tenant disputes a charge:

- The dispute records the charge, the claim (amount / source / responsibility), and the evidence reference
- The landlord sees the dispute alongside the source document
- Resolution is explicit: accept the dispute (charge adjusted with a visible correction event), or reject with a reason
- Never silently close disputes or silently adjust amounts

## Friction Points to Handle Gracefully

The pivot identifies known friction; build for these, not against them:

1. **Tenant won't connect bank** — lose primary payment detection for expenses. Fallback: manual confirmation, landlord bank feed where available.
2. **Users won't set up utility providers** — can't show expense payment status. Good "not yet configured" UX with nudges that add visible value when completed.
3. **Neither party connects bank** — can't verify rent. Degrade to manual confirmation; make the degradation visible.
4. **Users won't manually validate extracted expense values** — don't rely on it. Use web-portal cross-checks where available.

Many of these can be incentivized via reputation — completing setup, connecting banks, confirming data contribute to a higher trust rating. See `contract-management` for the reputation system.

## Related Notifications

Trigger notifications only at these moments (part of this domain):

- `rent_received` — landlord, tenant
- `rent_not_yet_received` (late) — landlord (primary), tenant (courtesy)
- `new_condo_boleto_detected` — bill holder
- `utility_bill_uploaded` — bill holder, counterparty
- `extraction_needs_review` — landlord
- `ambiguous_payment_match` — bill holder
- `bill_overdue` — bill holder
- `dispute_opened` — counterparty
- `dispute_resolved` — both parties
- `provider_missing_needs_example` — user who triggered it

No notification for silent ledger updates that don't require action.

## Release Strategy Implication

A full Brazil release is possible even without complete provider coverage — rent works everywhere. For regions/providers we don't yet support, the UX must be transparent (what's available, what's coming) and include persistent nudges to complete expense setup, since it adds real value.
