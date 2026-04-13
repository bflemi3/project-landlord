# Billing Intelligence Foundation — Plan 1d: Migration & Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Phase 0 dev page imports to use the new billing-intelligence module and remove old code.

**Architecture:** Mechanical refactor — update import paths, adapt UI to new ExtractionResult shape, delete old files. No new logic.

**Tech Stack:** TypeScript

**Part of:** Billing Intelligence Foundation (Plan 1)
**Depends on:** Plans 1a, 1b, 1c (all billing-intelligence code exists)

**Key changes:**
- `src/app/actions/phase0/enliv-lookup.ts` → import from `billing-intelligence/providers/enliv-campeche/api-client`
- `src/app/actions/phase0/enliv-extract.ts` → import from `billing-intelligence/providers/enliv-campeche/parser`
- `src/app/actions/phase0/cnpj-identify.ts` → import from `billing-intelligence/identification/`
- Delete `src/lib/cnpj/lookup.ts`, `src/lib/cnpj/types.ts`, `src/lib/cnpj/__tests__/lookup.test.ts`
- Delete `src/lib/providers/` (entire directory)
- Keep `src/lib/cnpj/validate.ts` and `src/lib/cpf/validate.ts` (generic utilities)

---
## Task 14: Update Phase 0 imports and clean up old code

**Files:**
- Modify: `src/app/actions/phase0/enliv-lookup.ts`
- Modify: `src/app/actions/phase0/enliv-extract.ts`
- Modify: `src/app/actions/phase0/cnpj-identify.ts`
- Delete: `src/lib/cnpj/lookup.ts`, `src/lib/cnpj/types.ts`, `src/lib/cnpj/__tests__/lookup.test.ts`
- Delete: `src/lib/providers/` (entire directory)

Keep `src/lib/cnpj/validate.ts`, `src/lib/cnpj/__tests__/validate.test.ts`, `src/lib/cpf/` — these are generic utilities.

- [ ] **Step 1: Update server action imports**

Update `src/app/actions/phase0/enliv-lookup.ts`:
- Change import from `@/lib/providers/enliv/api-client` to `@/lib/billing-intelligence/providers/enliv-campeche/api-client`

Update `src/app/actions/phase0/enliv-extract.ts`:
- Change import from `@/lib/providers/enliv/pdf-parser` to `@/lib/billing-intelligence/providers/enliv-campeche/parser`
- The new parser returns `ExtractionResult` instead of `EnlivBillExtraction`. The Phase 0 UI expects the old shape. Add a mapping in the server action to convert `ExtractionResult` back to the shape the UI expects, or update the UI components. The simplest approach: return the `ExtractionResult` directly and update the UI to use the new field paths (e.g., `result.data.billing.amountDue` instead of `result.data.amountDue`).

Update `src/app/actions/phase0/cnpj-identify.ts`:
- Change imports from `@/lib/cnpj/lookup` to `@/lib/billing-intelligence/identification/cnpj-extract` and `@/lib/billing-intelligence/identification/cnpj-lookup`

- [ ] **Step 2: Update Phase 0 UI components for new ExtractionResult shape**

The new parser returns amounts in minor units (centavos) and normalized dates. Update the display in `enliv-upload.tsx` to divide `amountDue` by 100 for display.

- [ ] **Step 3: Delete old files**

```bash
rm src/lib/cnpj/lookup.ts src/lib/cnpj/types.ts src/lib/cnpj/__tests__/lookup.test.ts
rm -rf src/lib/providers/
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test -- --run
```

Expected: all PASS.

- [ ] **Step 5: Run build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: migrate billing code to src/lib/billing-intelligence and clean up old code"
```

---

## Summary

After all 14 tasks:

- **3 DB migrations:** extended `provider_invoice_profiles` with category/region/status/capabilities, added `company_cache` + history (country-agnostic), added `engineer_allowlist` (with user_id FK)
- **Shared types** with `ExtractionResult` contract using `profileId` to link to DB
- **Provider interface** with `profileId` as the DB link, plus README documenting provider directory structure
- **External dependency monitor** — cross-cutting wrapper for all external calls with error normalization and reporting
- **Normalization utilities** for dates, months, barcodes, money
- **Extraction confidence utility** — uniform scoring across all providers
- **CNPJ extraction + cached lookup** with DB caching and change history
- **Provider registry** mapping `profileId` → code module
- **Enliv Campeche** code module (parser, API client, validation) — not yet linked to DB profile (will be created through playground in Plan 3)
- **Bill identification** orchestrating CNPJ → registry → provider
- **Old code cleaned up**

**Note:** No seed data. Enliv (and all future providers) will be created through the engineering playground (Plan 3), validating the full provider creation workflow.

**Next plans:**
- Plan 2: Test runner (test cases, accuracy measurement, CI) — should include API contract tests that verify external dependencies (BrasilAPI, ReceitaWS, Enliv API, etc.) still return the expected response shapes. Catches breaking changes in external APIs before they affect production.
- Plan 3: Playground UI (engineer auth, provider lab, accuracy dashboard)
- Plan 4: Custom MCP (Claude Code interface)
- Plan 5: Production integration (provider requests, user corrections, notifications)
- Plan 6: Knowledge base updates (CLAUDE.md, rules, skills) — includes a "provider discovery" skill that instructs Claude to proactively investigate a provider's digital presence (website, customer portals, public APIs, bill lookup tools) when building a new provider, rather than only building what it's explicitly told
