---
name: analytics
description: PostHog analytics events, funnels, and notification scope for the long-term rental product. Use when instrumenting features, building dashboards, or adding user-facing notifications.
paths:
  - "src/lib/posthog*"
  - "src/**/analytics*"
  - "src/**/notification*"
---

# Analytics & Notifications

Instrument the product from day one with PostHog. Track moments tied to product value — not noise.

## Philosophy

Events answer questions:

- Are landlords reaching the point where the product delivers its promise (rent visibility, expense visibility, contract-on-autopilot)?
- Are tenants engaging (connecting banks, viewing charges, building reputation)?
- Is provider coverage blocking activation? Where?
- Are extraction + payment matching trustworthy enough to be passive?
- Are the growth loops (tenant becoming landlord, LL reputation drawing tenants) working?

If an event doesn't help answer one of these, don't track it.

## Landlord Activation Funnel (core metric)

```
signed_up
→ property_created
→ address_confirmed
→ utility_providers_confirmed
→ bank_connected (landlord)
→ contract_created
→ tenant_invited
→ tenant_joined
→ bank_connected (tenant)
→ first_rent_detected
→ first_expense_detected
```

Each drop-off is actionable. Break down by `acquisition_channel` to compare channel quality.

## Tenant Engagement Funnel

```
tenant_invited
→ tenant_joined
→ bank_connected (tenant)
→ providers_confirmed
→ first_charge_viewed
→ first_payment_matched
→ reputation_score_established
```

## Required Events

**Onboarding & setup**
- `signed_up`
- `property_created`
- `address_confirmed`
- `utility_providers_confirmed`
- `provider_missing_reported` (with provider name + region)
- `condo_barcode_captured` (method: camera | upload | manual)
- `tenant_invited`
- `tenant_joined`

**Contract & lifecycle**
- `contract_created`
- `contract_adjustment_proposed`
- `contract_adjustment_confirmed`
- `contract_expiring_notified`
- `formal_notice_generated` (type: notice_1 | notice_2 | notice_3)

**Bank & payment detection**
- `bank_connected` (role: landlord | tenant; provider: pluggy | belvo)
- `bank_disconnected`
- `payment_auto_matched` (confidence)
- `payment_manually_confirmed`
- `payment_match_rejected`

**Billing**
- `charge_definition_created`
- `bill_uploaded` (method: email | upload | photo)
- `bill_extracted` (success | needs_review)
- `extraction_corrected`
- `charge_disputed`
- `dispute_resolved` (accepted | rejected)

**Trust & engagement**
- `reputation_score_updated`
- `charge_source_previewed`
- `live_billing_view_opened`

**Misc**
- `pulse_survey_answered`

Events removed vs pre-pivot: `statement_draft_created`, `statement_published`, `statement_viewed`, `payment_marked`, `payment_confirmed`, `payment_rejected` — replaced by the event set above.

## Person Properties

- `acquisition_channel` — set once at signup via `posthog.identify`. From the redeemed invitation's `source` column (`'waitlist'` | `'direct'` | `'tenant_invite'` | `'organic'`)
- `role` — `'landlord'` | `'tenant'` | `'both'` (updated when a tenant creates a property or a landlord accepts an invite)
- `country_code` — from the user's default property
- `bank_connected` — boolean, latest state

## Notifications — In-App + Email

Notifications share event taxonomy with analytics but aren't always 1:1. Some analytics events are silent (`charge_source_previewed`); some notifications don't need analytics events.

**MVP notification set** (see `billing-automation` and `contract-management` for the full per-domain lists):

- Bill detected, ambiguous match, extraction needs review, bill overdue
- Rent received, rent late, adjustment approaching, contract expiring
- Formal notice generated
- Dispute opened, dispute resolved
- Provider missing needs example
- Reputation score meaningfully updated

**Channels:** email + in-app. Push comes later if clearly valuable.

**Discipline:** no notification for silent ledger updates that don't require action. A notification is a demand on the user's attention — earn it.

## Tracking Rules

- Public pages: anonymous tracking under legitimate interest
- Authenticated app: identified tracking under legitimate interest with an opt-out toggle
- Do not track identified users before sign-up
- See `security-lgpd` rule for LGPD retention (analytics events: 2 years, then anonymize)
