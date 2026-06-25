# CLAUDE.md

## Project Overview

Brazil-first long-term rental management platform for small landlords and their tenants. Positioned as the alternative to paying 8–12% for professional property management — gives landlords the structure, visibility, and compliance tooling of a property manager without the management fee and without automatic reporting of rental income to Receita Federal.

Rent is first class. Property expenses (utilities, condo fees) are second class. Payment detection happens passively via Open Finance (Pluggy) on both parties' bank accounts. Bill discovery happens via DDA (Celcoin) for condo boletos and via Mabenn-built ingestion flows for utility convênio guides.

The product should feel calm, modern, mobile-first, trustworthy — closer to Wise / Venmo / Rocket Money / Linear than property-management or accounting software.

**The product is two-sided.** Landlord and tenant are both first-class users on one shared rental — same contract, charges, and payment truth underneath — but each role gets its own view and actions. The landlord's center of gravity is revenue: how much the property makes, this month / year / lifetime, across properties. The tenant's is their own obligations: rent and expenses, what's paid, what's upcoming, and a history of their payments and activity. Tenants can join solo (connecting a bank is the gate) and invite their landlord; the tenant side is free forever and is a primary growth channel.

**Three pillars:** (1) **Billing transparency & payment automation** — revenue visibility for landlords, passive payment detection for both sides; (2) **Contract management** — drafting, IPCA adjustments, renewals, Lei do Inquilinato notices, and an AI assistant for rental-law questions; (3) **Communication** — the rental conversation (maintenance, questions, negotiations, disputes) lives in-app, scoped to the rental.

Both sides build a reputation from concrete events and actions — not other users' opinions or star ratings. Because it's event-derived, the track record is verifiable and portable: it follows the person across rentals, on Mabenn or off.

See `docs/project/product-pivot-long-term-rentals.md` for the full product shape, pillars, and open questions.

---

## Build status

The three-pillar vision above is the target. **What's built is foundational, not the product itself** — the billing, contract, and communication pillars are largely unbuilt. **Shipped:** auth + invites, profile setup, property-creation wizard, contracts + rent tables, landing page + waitlist. **Not yet built:** essentially all of the core product — the live billing ledger, payment matching, Open Finance, DDA, bill ingestion, provider tooling, revenue tracking, reputation, disputes, communication, the AI assistant, and notifications. Domain skills carry per-area status; trust the code over any doc.

---

## Source of Truth

1. `.claude/skills/design-system/` — visual design, UX, spacing, hierarchy, motion. Design tokens + full spec: `/DESIGN.md`
2. `.claude/skills/component-library/` — approved components, variants, composition
3. `.claude/skills/frontend-patterns/` — performance, data fetching, component discipline
4. Domain skills — `billing-automation`, `contract-management`, `data-modeling`, `analytics`, `testing`, `email-templates`
5. `CLAUDE.md` — product shape, guardrails, working style
6. `docs/project/product-pivot-long-term-rentals.md` — product spec
7. Existing codebase — what is already implemented

**Precedence on conflict:**
1. `.claude/rules/*` (security-lgpd, database-migrations) override everything below.
2. Skill invariants override CLAUDE.md prose.
3. CLAUDE.md overrides codebase conventions.
4. Codebase conventions win over personal preference.
5. When two skills disagree, the more specific domain skill wins (e.g., `billing-automation` over `frontend-patterns` on a charge form).

When ambiguous, choose the option that keeps the product simple, preserves trust, avoids overbuilding, and keeps future expansion possible.

---

## Core Product Principles

- **Trust first** — every charge, adjustment, and payment should be understandable, traceable, and reviewable
- **Transparency by default** — landlord and tenant see the same billing view, same ledger, same contract
- **Rent first, expenses second** — the landlord's primary question is "am I getting paid and by how much?" — revenue visibility is the centerpiece
- **Passive by design** — payment detection, bill discovery, and reminders run in the background; surface only when action is needed
- **Mobile first for real** — core workflows comfortable on a phone
- **Summary first, detail second** — show the answer first, let users drill in
- **Brazil-first UX, multi-country data model.** Schemas MUST use `amount_minor integer` + `currency text` columns (canonical: `supabase/migrations/20260318120000_data_model_foundation.sql`). NEVER bake country/currency assumptions into domain types or Zod schemas. Anti-example: a `charges.amount_brl numeric` column.
- **Trust marketplace** — both tenants and landlords carry portable reputation scores; the platform rewards responsible behavior on both sides

---

## MVP Scope Guardrails

### Build now

Auth with profile setup (name, avatar, CPF), property creation from address (with utility provider derivation), multi-property support, charge definitions with bill-ownership flexibility (`landlord` or `tenant` holds each bill), contract creation and storage, IPCA-based adjustment reminders and suggestions, late-payment notice generation (Lei do Inquilinato cascade), bill ingestion for utilities (upload / email / photo) with Mabenn-built provider profiles, missing-provider flow with engineering alert, DDA condo boleto discovery via Celcoin, Open Finance bank connection for landlord and tenant (Pluggy), payment matching (CNPJ + amount + date), live billing view, monthly ledger with immutable past months, dispute flow with source document preview, tenant reputation scoring driven by concrete events, landlord reputation scoring, revenue tracking (monthly / cumulative / per-contract / per-property), tenant invites, notifications (email + in-app), audit trail, analytics from day one, public landing page, self-serve sign-up.

### Do not overbuild

In-app payment processing or wallet logic, native apps, complex offline, heavy admin tooling, AI-first extraction, enterprise property management, over-flexible billing engines, co-landlord collaboration, overcomplicated role hierarchies, AI knowledgebase / legal advisor (phase 2+), guided eviction process workflows (phase 2+), maintenance request workflows (phase 2+), messaging hub beyond notifications (phase 2+ — will be in-app when built, not WhatsApp integration).

### Pre-product-feature work (Phase 0 spike)

Prove out DDA, Open Finance, bill ingestion, and web-portal validation end-to-end in a local-only utility before building product features on top. Surface regulatory/contractual blockers (Open Finance go-live requirements, DDA commercial terms, LGPD obligations for bank transaction storage) before committing to the architecture.

---

## Technical Direction

- **Framework:** Next.js App Router — static public pages, client-rendered authenticated product
- **Backend:** Supabase (Postgres, Auth, Storage, RLS, Realtime) hosted in `sa-east-1`
- **Open Finance:** Pluggy — for landlord + tenant bank account connection
- **DDA:** Celcoin API for CPF-based condo boleto discovery
- **Analytics:** PostHog from day one — see `analytics` skill
- **Email:** Resend (inbound + outbound) on `mabenn.com`
- **Hosting:** Paid, no free-tier architecture constraints
- **Delivery:** PWA first, no native apps for MVP
- **Localization:** EN, PT-BR, ES — do not hardcode user-facing copy
- **Package manager:** pnpm

---

## Engineering Priorities

Optimize for: speed to first usable product, trust/clarity in billing, low operational complexity, future-proof data modeling, smooth mobile UX, secure access control, performant page loads and navigations.

Do not optimize prematurely for: hypothetical scale, extreme customization, complex infrastructure, advanced tooling, speculative future products.

---

## Working Style

- Prefer editing existing patterns over inventing new ones
- Avoid introducing libraries unless they clearly earn their keep
- Domain logic lives in `src/data/<domain>/`, organized around product domains (auth, properties, memberships, charges, contracts, ledger, ingestion, providers, bank-accounts, payments, reputation, disputes, notifications, analytics). See the `frontend-patterns` Data Layer table for the file pattern (`shared`/`server`/`client`/`actions`, added as needed — not all are required).

### Performance is a product feature

Navigation must feel instant. The user clicks, and within tens of ms they see the page shell + per-section skeletons that structurally match the final content. Content streams in section by section. The recipe: `loading.tsx` on every route, `'use client'` pushed to leaves, per-section `<SuspenseFadeIn fallback={<SectionSkeleton />}>`. Canonical examples: `src/components/suspense-fade-in.tsx` (boundary primitive); `src/data/landlord-home/server.ts` (`React.cache()` server fetcher pattern); `src/app/app/(focused)/p/new/[draftId]/page.tsx` (route shell). See `frontend-patterns` for the full pattern.

### Red flags — stop if you're thinking any of these

| Thought | Reality |
|---|---|
| "Just this once, AI extraction for one provider — we can do a profile later" | Violates "never AI-first for core billing." Build a provider profile via Mabenn engineering. |
| "I'll add a service-role call from TS, it's faster than a SECURITY DEFINER RPC" | Violates `auth/SKILL.md` invariant 7. Write the RPC. |
| "Float is fine for one money field, this is just display" | Violates `data-modeling`. Use `amount_minor integer` + `currency text`. Aggregations leak through display. |
| "This component already exists but is slightly wrong, I'll make a new one next to it" | Violates `component-library`. Edit the existing component or extend it with a variant. |
| "I'll skip the audit row, the mutation is obvious" | No silent mutation of financial records. Insert the audit event in the same transaction as the mutation. |
| "I'll hardcode this string in English for now and translate later" | Violates `Localization`. Add the key to `messages/{en,es,pt-BR}.json` and read via `useTranslations`. |

### Before implementing

- Does this fit the MVP scope above?
- Does this preserve trust and transparency?
- Does this stay mobile-first?
- Is there a simpler version that gets the value sooner?

### After building or modifying UI

When a feature introduces a new reusable component, layout pattern, or variant, update `docs/project/components.md` — see the `component-library` skill.

---

## Backend Patterns

Project-specific rules (generic backend wisdom omitted):

- Idempotent ingestion (bill uploads, email forwards, webhook handlers)
- Deterministic extraction via provider profiles — never AI-first for core billing
- Explicit audit trail on sensitive mutations (contracts, adjustments, disputes, payment matches, reputation events)
- No silent mutation of financial records (ledger is immutable per past month; corrections create explicit events)
- Payment matches must be reversible — no schema that assumes a match is final

---

## Wireframe Rules

Wireframes in `docs/wireframes/` are low-fidelity structural guides. Use them for layout structure and content hierarchy. Apply design judgment for color, spacing, typography. Follow the `design-system` skill and design tokens in `globals.css`. Never copy wireframe grays or placeholder styling into production code.

---

## Rules & Skills Reference

### Rules (`.claude/rules/`)

- **Security & LGPD** — `security-lgpd.md`
- **Authorization, lifecycle & external contracts** — `authorization-and-lifecycle.md`
- **Database migrations** — `database-migrations.md`
- **Linear + GitHub workflow** — `linear-github.md`
- **Versioning & releases** — `versioning-releases.md`

### Skills (`.claude/skills/`)

**Engineering foundations**
- `auth` — sign-in/sign-up, invite redemption, JWT claim gate, middleware. See `docs/project/architecture-auth.md`
- `frontend-patterns` — performance, data fetching, hook discipline, forms
- `design-system` — visual design, spacing, hierarchy, motion
- `component-library` — component catalog, selection rules
- `data-modeling` — schema rules, money, country/currency, audit
- `testing` — test locations, integration setup, server action pattern
- `email-templates` — React Email + Resend + Edge Function conventions

**Product domain**
- `billing-automation` — DDA, convênio ingestion, Open Finance matching, monthly ledger, bill ownership, disputes
- `contract-management` — contracts, IPCA adjustments, late-payment workflow, reputation

**Instrumentation**
- `analytics` — PostHog events, funnels, in-app + email notifications

**Meta**
- `planning` — how to write implementation plans from specs
