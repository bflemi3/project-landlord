---
name: payment-workflow
description: Manual payment marking and confirmation workflow rules. Use when building payment-related features.
paths:
  - "src/**/payment*"
  - "src/**/pay*"
---

# Payment Workflow

The MVP payment model is manual coordination, not payment processing.

## Supported Flow

1. Tenant marks statement paid
2. Landlord reviews
3. Landlord confirms or rejects
4. Rejection requires a reason
5. Issue can return to review/resolution

## Do Not Build

- Actual payment rails
- Wallet logic
- Payout systems
- Transaction ledger pretending to be a payment processor

Keep this workflow clear and lightweight.
