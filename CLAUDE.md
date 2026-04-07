# CLAUDE.md

## Project Overview

Brazil-first rental billing and utility coordination app for landlords and tenants. Replaces spreadsheet/email billing with a shared billing workspace. **Not a payment app** — a trust-first billing system focused on charge setup, bill ingestion, deterministic extraction, statement publishing, tenant visibility, disputes, and manual payment coordination.

Should feel calm, modern, mobile-first, trustworthy — closer to Wise / Venmo / Rocket Money than property-management software.

---

## Source of Truth

1. `.claude/skills/design-system/` — visual design, UX, spacing, hierarchy, motion, interaction patterns
2. `.claude/skills/component-library/` — approved components, variants, layout rules, composition
3. `CLAUDE.md` — engineering execution, architecture boundaries, product guardrails
4. Project planning docs — product scope, roadmap, business intent
5. Existing codebase — what is already implemented

When ambiguous, choose the option that keeps the MVP simple, preserves trust, avoids overbuilding, and keeps future expansion possible.

---

## Core Product Principles

- **Trust first** — every charge should be understandable, traceable, and reviewable
- **Transparency by default** — landlords and tenants see the same statement logic
- **Low friction** — easier than spreadsheets, not more powerful-but-heavier
- **Review before publish** — draft, validate, then publish
- **Mobile first** — core workflows comfortable on a phone
- **Summary first, detail second** — show the answer, then let users drill in
- **Collaboration without clutter** — multiple parties, focused UI
- **Brazil-first, future-ready** — optimize for Brazil now, keep the model extensible

---

## MVP Scope Guardrails

### Build now

Auth, property/unit setup, multi-property support, charge definitions, monthly recurring charges, responsibility allocation, statement drafting/publishing/revisions, completeness warnings, bill upload + ingestion email, provider invoice profiles, deterministic extraction + correction, tenant statement viewing, charge transparency, source document preview, multi-tenant visibility, tenant-side splits, tenant invites, dispute/review flow, payment marking + confirmation, notifications, audit trail, analytics, public landing page, self-serve sign-up, tenant-invites-landlord flow.

### Do not overbuild

In-app payments, banking/DDA, native apps, complex offline, heavy admin tooling, AI-first extraction, enterprise property management, over-flexible billing engines, co-landlord collaboration, overcomplicated roles.

---

## Technical Direction

- **Framework:** Next.js App Router — static public pages, client-rendered authenticated product
- **Backend:** Supabase (Postgres, Auth, Storage, RLS, optional Realtime) hosted in `sa-east-1`
- **Analytics:** PostHog from day one — see `.claude/skills/analytics/SKILL.md` for events and philosophy
- **Hosting:** Paid hosting, no free-tier architecture constraints
- **Delivery:** PWA first, no native apps for MVP
- **Localization:** EN, PT-BR, ES — do not hardcode user-facing copy

---

## Engineering Priorities

Optimize for: speed to first usable product, trust/clarity in billing, low operational complexity, future-proof data modeling, smooth mobile UX, secure access control.

Do not optimize prematurely for: hypothetical scale, extreme customization, complex infrastructure, advanced tooling, speculative future products.

---

## Working Style

- Prefer editing existing patterns over inventing new ones
- Keep solutions simple and composable
- Maintain strong TypeScript safety
- Favor readable code over clever abstractions
- Leave the codebase cleaner than you found it
- Avoid introducing libraries unless they clearly earn their keep

### Before implementing changes

- Does this fit the MVP scope?
- Does this preserve trust and transparency?
- Does this stay mobile-first?
- Does this use existing components? (check component-library skill)
- Does this align with the design system? (check design-system skill)
- Is there a simpler version that gets the value sooner?

### After building or modifying UI

When a feature introduces a new reusable component, layout pattern, or variant, update `docs/project/components.md` before considering the work done.

---

## Backend Patterns

- Explicit domain modeling, narrow understandable APIs/actions
- Idempotent ingestion workflows where possible
- Audit-friendly mutations, clear ownership and access checks
- Deterministic parsing/configuration patterns
- No magical pipelines, AI-dependent core workflows, complex event choreography, or hidden side effects around billing state

---

## Domain Organization

Organize around product domains: auth, properties, memberships, charges, statements, ingestion, provider-profiles, documents, disputes, payments, notifications, analytics. Keep domain logic close to where it is used.

---

## Performance

- Keep public pages lightweight, product screens responsive
- Use intentional loading states (universal `PageLoader`, not per-page skeletons)
- Minimize unnecessary round trips, use query caching thoughtfully
- Do not overuse SSR for authenticated screens

---

## Definition of Done

A feature must: match intended product behavior, respect access control, handle loading/empty/error states, work on mobile first, use existing components, align with the design system, avoid trust-breaking edge cases, emit required analytics for key workflows, and preserve statement/billing integrity.

---

## Wireframe Rules

Wireframes in `docs/wireframes/` are low-fidelity structural guides. Use them for layout structure and content hierarchy. Apply design judgment for color, spacing, typography. Follow the design system skill and design tokens in `globals.css`. Never copy wireframe grays or placeholder styling into production code.

---

## Rules & Skills Reference

Detailed guidance lives in rules and skills — not duplicated here:

- **Security & LGPD** — `.claude/rules/security-lgpd.md`
- **Database migrations** — `.claude/rules/database-migrations.md`
- **Linear + GitHub workflow** — `.claude/rules/linear-github.md`
- **Versioning & releases** — `.claude/rules/versioning-releases.md`
- **Frontend patterns** (hooks, forms, component ordering) — `.claude/skills/frontend-patterns/`
- **Data modeling** (money, entities, provider profiles) — `.claude/skills/data-modeling/`
- **Statement workflow** — `.claude/skills/statement-workflow/`
- **Bill ingestion & extraction** — `.claude/skills/bill-ingestion/`
- **Payment workflow** — `.claude/skills/payment-workflow/`
- **Tenant trust** — `.claude/skills/tenant-trust/`
- **Email templates** — `.claude/skills/email-templates/`
- **Notifications** — `.claude/skills/notifications/`
- **Testing priorities** — `.claude/skills/testing/`
- **Analytics events & funnels** — `.claude/skills/analytics/`
- **Design system** — `.claude/skills/design-system/`
- **Component library** — `.claude/skills/component-library/`
