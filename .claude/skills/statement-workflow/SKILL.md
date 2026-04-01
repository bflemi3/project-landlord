---
name: statement-workflow
description: Statement draft, publish, and revision workflow rules. Use when building statement-related features.
paths:
  - "src/**/statement*"
---

# Statement Workflow

The statement flow is central. Protect it.

## Draft Phase

- Recurring monthly charges generate into a draft statement
- Variable charges come from ingestion or manual entry
- Show completeness warnings for expected missing charges
- Warnings should help, not block

## Publish Phase

- Published statements are the shared monthly system of record
- Publishing should feel explicit and deliberate
- Publishing should snapshot the statement state

## Revision Phase

- Published statements may later change
- Revisions must be explicit — preserve history, show what changed
- Notify affected users
- **Never silently overwrite published financial records**
