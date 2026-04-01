---
name: tenant-trust
description: Tenant-facing UX trust requirements. Use when building tenant-visible features like statement views, charge displays, or dispute flows.
paths:
  - "src/**/tenant*"
  - "src/**/dispute*"
---

# Tenant Trust Requirements

Tenant-facing UX must reinforce trust.

## Charge Transparency

For relevant charges, surface the source:
- Manual entry
- Imported from bill
- Imported from bill and corrected before publish

## Tenant Capabilities

Where possible, let the tenant:
- Preview the source document
- Understand the amount and reason
- Dispute structured issues cleanly

## Principle

Avoid forcing trust through opacity. Every charge should be understandable, traceable, and reviewable.
