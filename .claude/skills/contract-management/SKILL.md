---
name: contract-management
description: Rental contract lifecycle — contracts, IPCA adjustments, reminders, late-payment legal workflow, landlord/tenant reputation. Use when building contract, adjustment, renewal, eviction, notice, or reputation features.
paths:
  - "src/**/contract*"
  - "src/**/adjustment*"
  - "src/**/ipca*"
  - "src/**/reputation*"
  - "src/**/rating*"
  - "src/**/renewal*"
  - "src/**/notice*"
  - "src/**/eviction*"
---

# Contract Management

## TL;DR

- Contracts are the source of truth for rent amount, due date, adjustment date, expiration. The billing ledger reads from contracts — never manual entry.
- All rent changes (adjustments, terminations) MUST insert a contract event row in the same transaction as the mutation.
- Reputation deltas MUST originate from explicit event rows — never direct score UPDATEs.
- Late-payment cascade (Lei do Inquilinato 8.245/91) MUST follow the legal notice ordering; skipping a step invalidates downstream notices.
- Never misrepresent the product as legal advice.

## Note on implementation status

The contract-management feature is largely unbuilt. Tables, server actions, and helpers referenced by this skill (e.g., contract events, reputation events, IPCA fetcher) are forthcoming. When the feature lands, update this skill with concrete file paths and migration IDs.

Pillar 2 of the product. Contracts are the central record of the rental relationship. Brazilian rentals run on 18–30 month contracts with annual IPCA-based adjustments, and small landlords forget adjustment dates, expiration dates, and the legal choreography for late payments. The product closes those gaps.

## The Contract Is the Source of Truth

A contract ties together: landlord, tenant(s), property/unit, rent amount, due date, start date, annual adjustment date, expiration date, adjustment index (IPCA by default), terms. The contract supplies the values the billing ledger uses for rent each month — not manual entry.

- A property can have contracts over time (tenancies) — preserve history
- Contracts are never silently rewritten. Changes (adjustment, extension, termination) record explicit events

## Contract Drafting

Draft contracts from Brazilian standard rental agreement templates. Store the rendered contract as the central record. Both parties can reference it.

**Template sources are not yet decided** — options include building our own, integrating with existing Brazilian contract platforms, or starting from standard templates. The skill doesn't commit to a specific path; the data model treats the template + rendered document as the product surface.

## IPCA Annual Adjustments

- Brazilian rentals typically adjust annually using the IPCA inflation index (IBGE)
- The platform tracks the adjustment date and, as it approaches, suggests a new rent amount using the IPCA series
- IPCA data source: IBGE API (subject to a feasibility spike — don't commit to it as a hard dependency until verified). Plan for alternate index codes (`IGP-M`, etc.) even if IPCA is the only live option

**MUST NOT apply an IPCA adjustment without an explicit `adjustment_confirmed` event row.** Anti-pattern: a server action that updates a contract's rent amount without inserting into the contract event log in the same transaction. Both parties see the proposed adjustment; the landlord confirms; the new rent amount takes effect from the adjustment date forward.

## Reminders

Automated reminders for both parties:

- Upcoming annual rent adjustment (e.g. 30 days before)
- Contract expiration / renewal window
- Scheduled rent due date (as part of the billing ledger, handled by `billing-automation`)

Reminders are notifications — see Related Notifications below.

## Late / Missed Payment Workflow

Brazilian rental law is strict about the notification cascade before an eviction can proceed (Lei do Inquilinato — Law 8.245/91). Small landlords don't know the process and miss steps.

**Phase 1 capability:**

- Automated notification flow for late rent (in-app + email, to both parties)
- Generate required paperwork for formal notices from templates
- Send notices via email and make them available in-app
- Guide the landlord through each step — what's next, when

**Phase 2+ capability (not now):**

- Guided eviction process workflows
- AI knowledgebase for contract-specific questions + general rental law

Never misrepresent the product as legal advice. Notices are paperwork helpers, not legal counsel.

## Reputation & Trust Marketplace

Both tenants and landlords earn portable reputation scores. This is the network effect layer.

### Tenant reputation

- Score reflects timely payments (rent, utilities, condo fees) across the tenant's history on the platform
- Portable — if the tenant moves to another landlord on the platform, that landlord sees the payment history and reliability score
- Creates real incentive to pay on time and stay on the platform
- Long-term vision: a trust signal for rental applications, potentially reducing fiador (guarantor) or caução (security deposit) requirements

### Landlord reputation

- Score reflects responsiveness to maintenance requests, dispute resolution fairness, tenant ratings
- Portable across future tenants — prospective tenants see the track record before committing
- Incentivizes responsiveness and fair dealing

### Reputation rules

- Scores MUST be explainable — show what drives them
- Score deltas MUST originate from a `reputation_events` row in the same transaction as the trigger event. NEVER direct UPDATE on score columns.
- Scores can only move based on concrete events (on-time payment, resolved dispute, maintenance response time) — never silent adjustments

### Rationalizations to reject (red flags)

| In-the-moment thought | Reality |
|---|---|
| "It's just a small score tweak, no event row needed" | Score deltas MUST originate from an event row. No direct UPDATE on score columns. |
| "I'll adjust rent now and log the event later" | Same transaction or it didn't happen. |
| "This notice is obvious, skip the audit row" | Lei do Inquilinato cascade requires the paper trail. No notice without an event. |
| "The user asked about contract law — I'll summarize what the law says" | Never misrepresent the product as legal advice. Notices are paperwork helpers, not counsel. |
| "Rent changes are simple — UPDATE the contracts row, done" | Every rent mutation MUST be paired with an event row. Both writes in the same transaction. |
- Both parties see their own score + factors; seeing *the other party's* score is exposed in appropriate contexts (prospective landlord viewing an applicant's tenant score; prospective tenant viewing a landlord's profile)
- Reputation is cross-property / cross-contract — follows the person, not the tenancy

**Detailed scoring model (what exact events, what weights, how decay works) is still a design spike.** Don't commit the model in code ahead of the design decision — build the event recording infrastructure first.

### Reputation as a friction unlock

Many onboarding friction points (connecting bank account, confirming providers, validating extraction) can be incentivized by tying completion to the user's reputation score. Both parties get a reason to engage rather than skip.

**Contract upload should be weighted higher than manual entry.** A landlord who uploads a contract provides richer, more verifiable data upfront (parties, terms, dates, expenses) compared to manual entry where they're likely to skip optional sections. The reputation system should reward this — uploading a contract earns more toward the landlord's score than creating a property manually. This incentivizes data completeness and gives the platform better information to work with (payment matching, dispute resolution, adjustment tracking).

## Precedence

- Conflicts with `billing-automation` ledger immutability: contract events MUST NOT mutate past-month ledger rows. Emit a current-month correction event instead.
- Conflicts with `data-modeling` audit rules: defer to `data-modeling` for audit-row shape and storage.
- Conflicts with `security-lgpd.md`: reputation visibility to the other party MUST respect RLS scopes.

## Related Notifications

Trigger notifications at these moments (part of this domain):

- `adjustment_approaching` — both parties, 30 days before annual adjustment date
- `adjustment_proposed` — both parties when landlord initiates
- `adjustment_confirmed` — tenant when landlord confirms
- `contract_expiring` — both parties, 60 days before
- `rent_late_notice_1` / `notice_2` / `notice_3` — both parties, per legal cascade
- `formal_notice_generated` — both parties when paperwork is produced
- `reputation_score_updated` — the person whose score changed (only on material movement)

See `billing-automation` for rent-received / rent-not-yet-received notifications — those are billing-domain events, not contract-domain.
