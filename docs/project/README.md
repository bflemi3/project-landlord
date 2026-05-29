# Mabenn — Project Overview

> An overview and doc map for the project. This file does not duplicate other docs — it points to them. If you're new here, read this first.

---

## What Mabenn is

A Brazil-first rental platform for landlords and tenants. Positioned as the alternative to paying 8–12% for property management — gives small landlords the structure, visibility, and compliance tooling of a property manager without the management fee and without automatic reporting of rental income to Receita Federal.

Both landlord and tenant are first-class users. The product runs in the background — Open Finance and DDA detect payments, bill ingestion finds new bills, the contract lifecycle is tracked from drafting through renewal — and surfaces only when action is needed.

For the full product shape, three pillars, mechanism details, and market thesis: **`docs/project/product-pivot-long-term-rentals.md`**.
For positioning, voice, audience, and marketing direction: **`docs/marketing/positioning-and-messaging-foundation.md`**.

---

## Product pillars

| Pillar | What it covers |
|---|---|
| **1. Rent and bills, seen automatically** | Both sides connect their banks. Mabenn watches both feeds (Open Finance), auto-discovers new boletos via DDA, and receives utility bills at a per-property ingestion email. No one enters data. |
| **2. Contract lifecycle** | Contracts are drafted in Mabenn from Brazilian templates. Annual IPCA adjustments, renewals, expirations, and late-payment cascades (Lei do Inquilinato notices through eviction paperwork) are tracked and drafted in-product. An AI assistant trained on Brazilian rental law and the user's specific contract answers questions from both sides. |
| **3. Two-sided trust marketplace** | Tenants and landlords build portable, event-driven reputations from on-platform events (on-time payments, IPCA acceptance, reply times, contracts honored). Records follow each user to their next Mabenn rental. |

**The landlord's centerpiece value is revenue visibility** — monthly, year-to-date, lifetime, per-property, per-contract. Rent tracking is the supporting evidence; "how much am I making?" is the headline question.

---

## Audience

| Role | Primary concern | Entry point |
|---|---|---|
| **Landlord** (1–5 properties, self-manages today) | "How much am I making? Is rent landing? Are bills getting paid? When's the next adjustment?" | Self-serve sign-up via the public landing page |
| **Tenant** (paying rent + utilities in their own name) | "What do I owe? Is my payment history visible? When and why will rent adjust?" | Invited by the landlord |
| **Future landlord / future tenant** (network effect) | "Can I see the other party's reputation before I sign?" | Joins to read a partner's record |

The buyer is the landlord. The tenant is invited, not acquired. For MVP, there is no separate tenant acquisition motion — see open question in the foundation doc.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) — static for public pages, client-rendered for the authenticated product |
| Backend | Supabase (Postgres + Auth + Storage + RLS + Realtime), hosted in `sa-east-1` (São Paulo) |
| Open Finance | Pluggy or Belvo (decision pending Phase 0 spike) — both landlord and tenant connect their banks |
| DDA (boleto discovery) | Celcoin API — registers CPF, receives boletos issued to it |
| Bill ingestion | Per-property inbound email address via Resend |
| Email (outbound) | Resend on `mabenn.com` |
| Analytics | PostHog from day one |
| Localization | `next-intl` — EN, PT-BR, ES day one. PT-BR institutional terms (IPCA, Lei do Inquilinato, fiadores, caução, condomínio, boletos) stay in PT-BR across all locales. |
| Hosting | Vercel (paid) |
| Delivery | PWA first; no native apps for MVP |
| Package manager | pnpm |

For architecture deep-dives see `docs/project/architecture-auth.md`, `docs/project/architecture-billing-intelligence.md`, `docs/project/architecture-notifications.md`.

---

## Doc map

### Read first

- **`CLAUDE.md`** (repo root) — product principles, MVP scope guardrails, working style, source-of-truth precedence. Operational guidance for working in the codebase.
- **`docs/project/product-pivot-long-term-rentals.md`** — full product shape, three pillars, payment-detection and bill-ingestion mechanisms, market positioning, open questions.
- **`docs/marketing/positioning-and-messaging-foundation.md`** — positioning, voice, audience, messaging pillars, visual direction, AI-generation instructions for marketing surfaces.

### Design

- **`/DESIGN.md`** (repo root) — the app design system: tokens, type, spacing, component patterns. Warm-dark editorial (Mercury/Linear). Authenticated product surfaces.
- **`docs/project/design-editorial-reference.md`** — the storytelling *presentation* layer (hero shells, glows, hand-drawn tutorial kit, real-UI-as-illustration) on top of the shared language. Landing / marketing / onboarding surfaces.
- **`docs/project/components.md`** — component catalog: file paths, props, variants, composition rules.

### Architecture

- **`docs/project/architecture-auth.md`** — auth flows, invite redemption, JWT claim gate, middleware.
- **`docs/project/architecture-billing-intelligence.md`** — bill ingestion, provider profiles, payment matching.
- **`docs/project/architecture-notifications.md`** — email and in-app notification flows.

### Research

- **`docs/project/research-dda-open-finance.md`** — DDA and Open Finance findings from the Phase 0 spike.
- **`docs/research/interview-imobiliarias.md`** — customer-discovery interview script (consent + questions) for validating the target audience and problem with imobiliárias, property managers, and landlords.

### Specs and plans

- **`docs/superpowers/specs/`** — feature and UX specs. Each spec defines *what* a feature is and *why*; the planner decides *how*.
- **`docs/superpowers/plans/`** — implementation plans broken down from specs.

### Wireframes

- **`docs/wireframes/`** — low-fidelity structural guides for layouts and content hierarchy. Use them for structure; apply design judgment from `/DESIGN.md` and `design-editorial-reference.md` for the visual layer.

### Rules and skills

- **`.claude/rules/`** — hard rules. `security-lgpd.md`, `database-migrations.md`, `linear-github.md`, `versioning-releases.md`.
- **`.claude/skills/`** — engineering foundations and domain skills. Auth, frontend patterns, design system, component library, data modeling, testing, email templates, billing automation, contract management, analytics, planning.

### Sales and history

- **`docs/sales/alex-pitch.md`** — historical artifact from the pre-pivot positioning. Do not use as a positioning source.

### Release notes

- **`CHANGELOG.md`** (repo root) — user-facing release notes per version.

---

## Source-of-truth precedence

When two sources disagree:

1. `.claude/rules/*` (security/LGPD, database migrations) override everything below.
2. Skill invariants in `.claude/skills/*` override CLAUDE.md prose.
3. `CLAUDE.md` overrides codebase conventions.
4. Codebase conventions win over personal preference.
5. When two skills disagree, the more specific domain skill wins (e.g., `billing-automation` over `frontend-patterns` on a charge form).

This precedence is also documented in CLAUDE.md.

---

## Onboarding (for a new contributor or AI agent)

1. Read **CLAUDE.md** first. It sets the operational frame.
2. Read **`docs/project/product-pivot-long-term-rentals.md`** for the product shape.
3. Skim **`docs/marketing/positioning-and-messaging-foundation.md`** for how Mabenn is described externally.
4. Read **`/DESIGN.md`** (app design system) and **`docs/project/design-editorial-reference.md`** (storytelling presentation layer) — one shared warm-dark language, split by operating vs storytelling.
5. Read **`docs/project/components.md`** before building UI.
6. Check **`.claude/rules/`** before touching the database, auth, or security-sensitive code.
7. Find the relevant skill in **`.claude/skills/`** before implementing anything in a domain (auth, billing, contracts, etc.).
8. Look at recent specs in **`docs/superpowers/specs/`** for examples of what current-quality spec work looks like.

---

## Working norms

- **Performance is a product feature.** Per-route `loading.tsx`, `'use client'` pushed to leaves, per-section `<SuspenseFadeIn fallback={<SectionSkeleton />}>`. See `frontend-patterns` skill.
- **Brazil-first UX, multi-country data model.** Money is stored as `amount_minor integer` + `currency text`. Country-aware data model from day one. Never bake BRL or PT-BR into types or Zod schemas.
- **No silent mutation of financial records.** Past months in the ledger are immutable; corrections create explicit events. Audit rows on every sensitive mutation.
- **Never AI-first for core billing.** Bill extraction uses deterministic provider profiles maintained by engineering, not LLM extraction.
- **Localization is invariant.** No EN-only ship. Every user-facing string lives in `messages/{en,es,pt-BR}.json`.
- **Linear ↔ GitHub coupling.** Branches include the Linear issue ID; PR titles use the `PRO-XXX: …` prefix. See `.claude/rules/linear-github.md`.
- **Changelog before version bump.** Versioning and release process in `.claude/rules/versioning-releases.md`.

---

## Status

The product is in active development. Phase 0 (infrastructure spike for DDA, Open Finance, bill ingestion) is the current gating work before broader product features land on top. See `docs/superpowers/plans/` for active workstreams and `CHANGELOG.md` for what has shipped.
