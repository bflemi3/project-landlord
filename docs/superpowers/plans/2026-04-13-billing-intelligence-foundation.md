# Billing Intelligence Foundation — Plan Index

This plan has been split into four sub-plans for efficient execution:

| Plan | File | Tasks | What it builds |
|---|---|---|---|
| **1a** | [DB & Types](2026-04-13-billing-intelligence-1a-db-types.md) | 1-5 | DB migrations, shared types, Provider interface |
| **1b** | [Utilities](2026-04-13-billing-intelligence-1b-utilities.md) | 6-9 | Normalization, external monitor, PDF extraction, confidence |
| **1c** | [Provider System](2026-04-13-billing-intelligence-1c-provider-system.md) | 10-13 | CNPJ identification, registry, Enliv provider, bill ID |
| **1d** | [Migration & Cleanup](2026-04-13-billing-intelligence-1d-migration-cleanup.md) | 14 | Update imports, delete old code |

## Execution Order

1a → 1b → 1c → 1d (sequential — each depends on the previous)

## Full Plan Series

- **Plan 1 (this):** Foundation — database, types, utilities, provider system
- **Plan 2:** Test runner — test cases, accuracy measurement, CI, API contract tests
- **Plan 3:** Playground UI — engineer auth, provider lab, accuracy dashboard
- **Plan 4:** Custom MCP — Claude Code interface
- **Plan 5:** Production integration — provider requests, user corrections, notifications
- **Plan 6:** Knowledge base updates — CLAUDE.md, rules, skills (includes provider discovery skill)
