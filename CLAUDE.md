# CLAUDE.md

## Project Overview

This project is a Brazil-first rental billing and utility coordination app for landlords and tenants.

The product replaces spreadsheet- and email-driven billing workflows with a shared billing workspace that helps landlords manage rent and recurring property charges across multiple properties while giving tenants clear visibility into what they owe and why.

The MVP is intentionally **not** a payment app. It is a **trust-first billing system** focused on:

- landlord property + charge setup
- bill ingestion
- deterministic extraction + review
- monthly statement drafting + publishing
- tenant visibility
- dispute / review workflows
- manual payment marking + confirmation
- analytics around trust, clarity, activation, and adoption

The app should feel calm, modern, mobile-first, and trustworthy. It should feel closer to Wise / Venmo / Rocket Money than to traditional property-management or accounting software.

---

## Source of Truth Documents

When making implementation decisions, use the following priority order:

1. `docs/project/design.md` — source of truth for visual design, UX polish, component feel, spacing, hierarchy, typography, motion, and interaction style
2. `CLAUDE.md` — source of truth for engineering execution guidance, architecture boundaries, product guardrails, and working conventions
3. project planning markdown docs — source of truth for product scope, roadmap, workflows, and business intent
4. the existing codebase — source of truth for what is already implemented

If these conflict:

- prefer `docs/project/design.md` for design/UI decisions
- prefer this file for implementation approach and engineering guardrails
- prefer the latest project plan for product scope and roadmap intent
- do not silently invent product behavior that conflicts with the plan

If something is ambiguous, choose the option that:

- keeps the MVP simple
- preserves trust and transparency
- avoids overbuilding
- keeps future expansion possible without making the MVP heavier

---

## Core Product Principles

These principles should shape implementation decisions:

- **Trust first** — every charge should be understandable, traceable, and reviewable
- **Transparency by default** — landlords and tenants should be able to understand the same statement logic
- **Low friction** — the app should feel easier than spreadsheets, not more powerful-but-heavier
- **Review before publish** — draft, validate, then publish
- **Mobile first** — core workflows should be comfortable on a phone
- **Summary first, detail second** — show the answer first, then let users drill in
- **Collaboration without clutter** — multiple parties can participate, but the UI should stay focused
- **Brazil-first, future-ready** — optimize UX and workflows for Brazil now, but keep the model extensible

---

## MVP Scope Guardrails

Stay focused on the MVP.

### Build now

- auth
- property + unit setup
- multi-property landlord support
- charge definitions
- monthly recurring charges
- landlord / tenant responsibility allocation
- statement drafting
- completeness warnings
- bill upload + landlord-level ingestion email workflow
- provider invoice profiles
- deterministic extraction + correction workflow
- statement publishing
- statement revisions
- tenant statement viewing
- charge transparency indicators
- source document preview/access
- multi-tenant visibility
- tenant-side split coordination
- tenant invites
- dispute / review flow
- tenant marks paid
- landlord confirms / rejects payment
- notifications
- audit trail
- analytics instrumentation
- public landing page
- self-serve landlord sign-up
- tenant-invites-landlord flow

### Do not overbuild yet

- in-app payments
- full banking / Open Finance / DDA dependency
- native mobile apps
- complex offline mode
- heavy admin tooling
- AI-first extraction
- enterprise-grade property management features
- advanced SSR-heavy product architecture
- over-flexible billing engines
- co-landlord collaboration unless explicitly added later
- overcomplicated role systems

### Treat as later / bounded spikes

- Pluggy / DDA integrations
- Pix / card payments
- AI-assisted validation
- per-unit ingestion aliases
- anomaly detection
- landlord analytics beyond what is needed for MVP validation

---

## Target Users

### Landlord

Needs to:

- create properties and units
- define expected charges
- ingest bills
- validate extracted bill data
- publish monthly statements
- manage revisions
- confirm or reject payment claims

### Tenant

Needs to:

- view published statements
- understand what is owed and why
- see whether charges came from a bill, manual entry, or bill correction
- preview supporting documents when available
- dispute questionable charges
- mark payment activity

### Shared household / additional tenant

Needs to:

- be invited into the property
- see statement visibility
- coordinate split responsibilities on the tenant side without changing landlord-defined obligations

---

## UX Philosophy

Use `docs/project/design.md` for the specifics, but the default product behavior should follow these rules:

- one primary job per screen
- large readable typography
- spacious layout
- strong information hierarchy
- obvious primary actions
- comfortable mobile tap targets
- minimal visual clutter
- intentional use of cards
- progressive disclosure over dense screens
- bottom sheets over modal-heavy UX when appropriate
- polished loading, empty, success, and error states
- motion only when it improves orientation or confidence

Do not ship spreadsheet-like primary interfaces unless there is no better option.

---

## Design Implementation Rules

Always consult `docs/project/design.md` before making UI decisions.

If a design detail is not specified there, default to:

- mobile-first responsive layouts
- large text over dense information packing
- neutral base palette with teal as the primary accent
- clean whitespace-driven hierarchy
- calm, premium, financial-app-adjacent feel
- accessible contrast
- semantic, explicit statuses
- subtle and purposeful motion

When in doubt, reduce complexity instead of adding more UI.

### Never do this

- tiny text to fit more content
- dashboard clutter
- multiple competing primary CTAs
- deeply nested cards/boxes
- enterprise-heavy admin aesthetics
- color-only status communication
- flashy decorative animation
- desktop layouts that lose the calm mobile-first feel

---

## Technical Direction

### Framework

Use **Next.js App Router**.

Reasoning:

- public SEO landing pages matter
- authenticated product can still be mostly client-driven
- shared codebase for marketing + product is simpler for MVP

### Rendering strategy

- public marketing pages: static by default
- authenticated product: mostly client-rendered
- use server-side logic only when it materially improves security or reduces complexity
- do not make routine product UX depend on dynamic SSR

### Backend

Use **Supabase** as the core platform:

- Postgres
- Auth
- Storage
- Row Level Security
- optional Realtime where useful

### Analytics

Use **PostHog** from day one for product analytics and funnel instrumentation.

### Hosting

Assume **paid hosting** if needed for a production MVP.
Do not optimize architecture around free-tier constraints.

### PWA

Ship as a **Progressive Web App** first.
Do not build native apps for MVP.

---

## Engineering Priorities

Optimize for:

1. speed to first usable product
2. trust and clarity in the billing workflow
3. low operational complexity
4. future-proof data modeling
5. smooth mobile UX
6. secure, privacy-conscious access control

Do not optimize prematurely for:

- hypothetical scale
- extreme customization
- complex infrastructure
- advanced internal tooling
- speculative future products

---

## Data Modeling Principles

Design the schema for future flexibility, even when the MVP UI exposes only the narrow version.

### Important modeling ideas

- money stored in minor units + currency
- country-aware model even if operations are Brazil-only
- monthly billing first, but avoid baking in assumptions that make future cadence expansion impossible
- provider invoice profiles stored as data, not hardcoded logic
- clear distinction between:
  - charge definitions
  - charge instances
  - statements
  - source documents
  - payment events
  - audit history
- support multiple tenants per property
- support tenant-side splits without changing landlord-defined obligations
- preserve published statement history and revisions
- make extracted data reviewable and correctable

### Likely core entities

- users
- properties
- units
- memberships / roles
- providers / issuers
- provider invoice profiles
- example documents
- charge definitions
- recurring rules
- charge instances
- responsibility allocations
- tenant splits
- statements
- source documents
- payment events
- notifications
- audit events

---

## Security and Privacy Rules

This product is handling sensitive billing and document data. Treat security and privacy as first-class.

### Required

- Row Level Security on all property-scoped and user-scoped data
- role-aware access control
- secure document storage
- audit trail for sensitive changes
- explicit revision tracking for statements
- data minimization
- retention/deletion awareness
- privacy-conscious handling of uploaded files and extracted data

### Never do this

- expose cross-property data accidentally
- trust client-only authorization
- allow silent mutation of published financial records
- treat extracted document data as inherently correct
- store money as floating point values

---

## Bill Ingestion and Extraction Rules

MVP extraction is **deterministic, not AI-first**.

### Supported inputs

- manual PDF/image upload
- landlord-level bill-ingestion email flow
- manual email forwarding

### Workflow expectations

1. document received
2. raw source stored
3. provider invoice profile applied
4. extraction attempted
5. required fields validated
6. ambiguous or missing fields flagged
7. landlord reviews and corrects if needed
8. only approved data can reach a published statement

### Important rule

Never treat extraction output as the source of truth without human review in MVP flows that affect published charges.

### Every extraction failure should create useful product data

- source document reference
- provider/profile used
- failure category
- corrected values
- final approved output

This feedback loop matters.

---

## Statement Workflow Rules

The statement flow is central. Protect it.

### Draft phase

- recurring monthly charges can be generated into a draft statement
- variable charges come from ingestion or manual entry
- show completeness warnings for expected missing charges
- warnings should help, not block

### Publish phase

- published statements are the shared monthly system of record
- publishing should feel explicit and deliberate
- publishing should snapshot the statement state

### Revision phase

- published statements may later change
- revisions must be explicit
- preserve history
- show what changed
- notify affected users
- never silently overwrite published financial records

---

## Payment Workflow Rules

The MVP payment model is manual coordination, not payment processing.

### Supported flow

- tenant marks statement paid
- landlord reviews
- landlord confirms or rejects
- rejection should require a reason
- issue can return to review/resolution

### Do not build

- actual payment rails
- wallet logic
- payout systems
- transaction ledger pretending to be a payment processor

Keep this workflow clear and lightweight.

---

## Tenant Trust Requirements

Tenant-facing UX must reinforce trust.

For relevant charges, aim to surface:

- manual entry
- imported from bill
- imported from bill and corrected before publish

Where possible, let the tenant:

- preview the source document
- understand the amount
- understand the reason
- dispute structured issues cleanly

Avoid forcing trust through opacity.

---

## Notifications

Notifications should support important workflow moments without creating noise.

### MVP notifications

- statement ready
- statement updated
- due reminders
- extraction needs review
- dispute opened
- payment marked
- payment confirmed
- payment rejected
- new invoice profile ready

Support:

- email
- in-app notifications

Push can come later if it is easy and clearly valuable.

---

## Analytics Requirements

Instrument the product from day one.

### Track at minimum

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

### Analytics philosophy

Track events that answer:

- are landlords activating?
- are tenants viewing?
- is the workflow replacing the spreadsheet?
- is extraction trustworthy?
- are collaborative growth loops working?
- are users feeling clarity and confidence?

Do not instrument random noise. Track moments tied to product value.

---

## Localization

The MVP should support:

- English
- Brazilian Portuguese
- Spanish

Implementation expectations:

- do not hardcode user-facing copy if avoidable
- design layouts to tolerate longer translated strings
- prioritize Brazilian Portuguese quality where tradeoffs exist
- do not assume U.S.-centric billing language

---

## Performance Philosophy

Prioritize perceived speed and simplicity.

### Do

- keep public pages lightweight
- keep product screens responsive
- use intentional skeleton states
- minimize unnecessary round trips
- use query caching thoughtfully
- keep bundles under control
- polish transitions and action feedback

### Do not

- overuse SSR for authenticated screens
- add infrastructure complexity to solve problems that do not exist yet
- sacrifice clarity for premature optimization

---

## Working Style for Claude

When helping in this repo:

- prefer editing existing patterns over inventing new ones
- keep solutions simple and composable
- explain tradeoffs when making non-obvious architectural choices
- preserve future flexibility without overbuilding now
- avoid introducing libraries unless they clearly earn their keep
- maintain strong TypeScript safety
- favor readable code over clever abstractions
- leave the codebase cleaner than you found it

### Before implementing meaningful changes

Check:

- does this fit the MVP scope?
- does this preserve trust and transparency?
- does this stay mobile-first?
- does this align with `docs/project/design.md`?
- is there a simpler version that gets the value sooner?

If the answer is no, simplify.

---

## Preferred Frontend Patterns

Default to:

- server components only where they are clearly beneficial
- client components for interactive authenticated product flows
- query-based client fetching for app data
- strong loading / empty / error / success states
- reusable UI primitives
- form validation with explicit and humane error messaging
- accessible components
- clear status indicators
- deliberate state transitions

Avoid:

- giant all-in-one page components
- hidden business logic inside presentational components
- brittle state spaghetti
- speculative abstraction layers
- premature design-system complexity beyond what the app actually uses

---

## Preferred Backend Patterns

Default to:

- explicit domain modeling
- narrow, understandable APIs / actions
- idempotent ingestion workflows where possible
- audit-friendly mutations
- clear ownership and access checks
- deterministic parsing/configuration patterns
- background processing only when truly useful

Avoid:

- magical pipelines that are hard to debug
- AI-dependent core workflows
- complex event choreography too early
- hidden side effects around billing state

---

## Testing Priorities

Prioritize tests around:

- permissions and access control
- money calculations
- responsibility allocation
- statement generation
- statement revision behavior
- extraction validation logic
- dispute flow
- payment mark / confirm / reject flow
- localization-sensitive UI states
- critical mobile UX regressions where practical

Not every component needs exhaustive testing.
The sensitive workflow logic does.

---

## Suggested Folder / Domain Mindset

Organize around product domains, not just technical layers.

Example domains:

- auth
- properties
- memberships
- charges
- statements
- ingestion
- provider-profiles
- documents
- disputes
- payments
- notifications
- analytics

Keep domain logic close to where it is used.
Avoid a repo structure that makes core workflows hard to trace.

---

## Definition of Done

A feature is not done just because it "works."

It should also:

- match the intended product behavior
- respect access control
- handle loading / empty / error states
- work on mobile sizes first
- feel aligned with `docs/project/design.md`
- avoid obvious trust-breaking edge cases
- emit required analytics if it is a key workflow
- preserve statement / billing integrity where relevant

---

## Linear + GitHub Integration Rules

This project uses Linear for issue tracking with GitHub integration for automatic status updates. Follow these conventions so that issues move through the workflow automatically.

### Branch naming

Include the Linear issue identifier in the branch name:

```
username/PRO-123-short-description
```

Examples:
- `brandon/PRO-42-add-tenant-invite-flow`
- `feature/PRO-123-fix-statement-publishing`

The identifier (`TEAM-NUMBER`) is case-insensitive. It must appear somewhere in the branch name.

### PR titles

Include the issue identifier in the PR title:

```
PRO-123: Description of changes
```

### PR descriptions and commit messages

Use magic words to link issues when needed:

```
Closes PRO-123
Fixes PRO-123
Resolves PRO-123
```

### Automatic status transitions

| Git/PR Event | Linear Issue Status |
|---|---|
| Branch created with issue ID | **In Progress** |
| PR opened | **In Review** |
| PR merged | **Done** |

### Rules

- Every feature branch must reference a Linear issue ID
- Do not create branches or PRs without a corresponding Linear issue
- Use the team prefix `PRO` (e.g., `PRO-123`)
- When a PR addresses multiple issues, list each with a magic word in the PR description

### Milestones

| # | Milestone | Goal | Timeline |
|---|---|---|---|
| M1 | Foundation & Public Entry | Auth, property/unit setup, PWA shell, landing page | Weeks 3–4 |
| M2 | Landlord Billing Workflow | Charges, statements, completeness, publishing, revisions | Weeks 5–6 |
| M3 | Bill Ingestion & Extraction | Upload, email ingestion, bill formats, extraction, correction | Weeks 7–8 |
| M4 | Tenant Trust & Collaboration | Tenant views, splits, disputes, payment marking, notifications | Weeks 9–10 |
| M5 | Launch Readiness | Growth loops, analytics, pulse surveys, QA, deploy | Weeks 11–12 |

### Features by Milestone

#### M1: Foundation & Public Entry

| Feature | Description |
|---|---|
| Auth: Email + Google sign-in | Low-friction onboarding for landlords and tenants |
| Localization: EN + PT-BR + ES | i18n foundation with three languages |
| PWA foundation | Installable experience, service worker, manifest |
| Theme support scaffolding | Light / dark / system theme |
| Property and unit setup | Core object model — create properties, add units |
| Multi-property landlord support | Landlord can manage multiple properties |
| Memberships and roles | Role-based access: landlord, tenant |
| Country-aware data model | Brazil-first but extensible |
| Currency-aware money model | BRL in minor units, extensible to other currencies |
| Public landing page | Marketing page with value proposition |
| Landlord self-serve sign-up | Sign-up flow from landing page |

#### M2: Landlord Billing Workflow

| Feature | Description |
|---|---|
| Charge definitions | Define rent and expected recurring/variable charges per unit |
| Monthly recurring charge support | Auto-generate recurring charges each month |
| Landlord/tenant responsibility allocation | Define who pays what portion of each charge |
| Draft charge instances | Create charge instances in draft for review |
| Statement generation | Generate monthly draft statements from charge definitions |
| Statement completeness warnings | Flag missing expected charges before publish |
| Monthly statement publishing | Publish statements as shared system of record |
| Statement revision tracking | Track changes to published statements, preserve history |
| Audit trail foundation | Log sensitive changes for trust and debugging |

#### M3: Bill Ingestion & Extraction

| Feature | Description |
|---|---|
| Manual PDF/image upload | Upload bill documents directly |
| Landlord bill-ingestion email address | Forward bills to a dedicated email for ingestion |
| Provider bill formats (data-driven) | Configurable extraction profiles per provider |
| Example document previews | Help landlords pick the right bill format |
| New bill format request workflow | Submit sample bill when correct format doesn't exist |
| Deterministic extraction flow | Apply bill format rules to extract charge data |
| Extraction validation and correction | Review, correct, and approve extracted data |
| Raw document storage | Store source documents with ingestion metadata |
| Ingestion status handling | Track document processing state |

#### M4: Tenant Trust & Collaboration

| Feature | Description |
|---|---|
| Tenant statement view | Tenant sees published statements with what they owe |
| Charge source transparency indicators | Show if charge is manual, imported, or corrected |
| Source document preview/access | Tenant can view the original bill |
| Multiple tenants per property | Equal permission scope for shared households |
| Tenant-side split coordination | Tenants divide their portion without changing landlord obligations |
| Tenant invites | Invite household members to shared visibility |
| Charge dispute/review flow | Structured way to question charges |
| Tenant marks paid | Tenant records payment with method, date, receipt |
| Landlord confirms/rejects payment | Landlord reviews and confirms or rejects with reason |
| Landlord Pix key | Profile-level Pix key with per-unit override, shown on mark-as-paid |
| Payment receipt upload | Optional receipt upload as proof of payment |
| In-app notifications | Notification center for workflow events |
| Email notifications | Email alerts for key moments (statement ready, payment, disputes) |

#### M5: Launch Readiness

| Feature | Description |
|---|---|
| Tenant-invites-landlord flow | Tenant-driven landlord acquisition loop |
| Landlord acquisition attribution | Track where new landlords come from |
| Pulse surveys | Trust and clarity signals at end of billing cycle |
| PostHog analytics instrumentation | Event tracking for activation, usage, growth |
| QA and testing | Permission tests, money calculations, workflow coverage |
| LGPD-conscious review | Privacy and data handling audit |
| Deployment and launch prep | Production deploy, monitoring, launch checklist |

### Notes for Linear Setup

- Create one **Project** per milestone (M1–M5)
- Create **Issues** for each feature within the corresponding project
- Larger features should be broken into sub-issues during implementation
- Use **Labels** for feature categories: `auth`, `properties`, `charges`, `statements`, `ingestion`, `tenants`, `payments`, `notifications`, `analytics`, `infrastructure`
- Set milestone target dates based on the roadmap timeline
- Link the GitHub repo so branch/PR automation works

---

## Final Reminders

This product wins by being:

- simpler than spreadsheets
- clearer than email threads
- more trustworthy than ad hoc billing
- more focused than bloated property-management software

Every implementation decision should protect that.

When in doubt:

- simplify
- make it clearer
- preserve trust
- keep it mobile-first
- avoid building the future at the expense of the MVP
