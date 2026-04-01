---
name: analytics
description: PostHog analytics event tracking requirements. Use when instrumenting features or building analytics.
paths:
  - "src/lib/posthog*"
  - "src/**/analytics*"
---

# Analytics Requirements

Instrument the product from day one with PostHog.

## Required Events

- property_created
- charge_definition_created
- bill_received
- extraction_failed
- correction_submitted
- statement_published
- statement_viewed
- tenant_invited
- tenant_split_created
- charge_disputed
- payment_marked
- payment_rejected
- payment_confirmed
- pulse_survey_answered

## Philosophy

Track events that answer:
- Are landlords activating?
- Are tenants viewing?
- Is the workflow replacing the spreadsheet?
- Is extraction trustworthy?
- Are collaborative growth loops working?
- Are users feeling clarity and confidence?

Do not instrument random noise. Track moments tied to product value.
