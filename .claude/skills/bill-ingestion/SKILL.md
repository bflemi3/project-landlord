---
name: bill-ingestion
description: Bill ingestion and extraction workflow rules. Use when building bill upload, email ingestion, extraction, or correction features.
paths:
  - "src/**/ingestion/**"
  - "src/**/bill*"
  - "src/**/extract*"
  - "src/**/provider*"
---

# Bill Ingestion and Extraction

MVP extraction is **deterministic, not AI-first**.

## Supported Inputs

- Manual PDF/image upload
- Landlord-level bill-ingestion email flow
- Manual email forwarding

## Workflow

1. Document received
2. Raw source stored
3. Provider invoice profile applied
4. Extraction attempted
5. Required fields validated
6. Ambiguous or missing fields flagged
7. Landlord reviews and corrects if needed
8. Only approved data can reach a published statement

## Critical Rule

Never treat extraction output as the source of truth without human review in MVP flows that affect published charges.

## Extraction Failures Must Produce Data

Every failure creates: source document reference, provider/profile used, failure category, corrected values, final approved output. This feedback loop improves provider profiles over time.
