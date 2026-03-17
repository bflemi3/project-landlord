# Linear Project Plan

Features and milestones organized for Linear, based on the project plan feature prioritization and development roadmap.

---

## Milestones

| # | Milestone | Goal | Timeline |
|---|---|---|---|
| M1 | Foundation & Public Entry | Auth, property/unit setup, PWA shell, landing page | Weeks 3–4 |
| M2 | Landlord Billing Workflow | Charges, statements, completeness, publishing, revisions | Weeks 5–6 |
| M3 | Bill Ingestion & Extraction | Upload, email ingestion, bill formats, extraction, correction | Weeks 7–8 |
| M4 | Tenant Trust & Collaboration | Tenant views, splits, disputes, payment marking, notifications | Weeks 9–10 |
| M5 | Launch Readiness | Growth loops, analytics, pulse surveys, QA, deploy | Weeks 11–12 |

---

## Features by Milestone

### M1: Foundation & Public Entry

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

### M2: Landlord Billing Workflow

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

### M3: Bill Ingestion & Extraction

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

### M4: Tenant Trust & Collaboration

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
| Payment receipt upload | Optional comprovante upload as proof of payment |
| In-app notifications | Notification center for workflow events |
| Email notifications | Email alerts for key moments (statement ready, payment, disputes) |

### M5: Launch Readiness

| Feature | Description |
|---|---|
| Tenant-invites-landlord flow | Tenant-driven landlord acquisition loop |
| Landlord acquisition attribution | Track where new landlords come from |
| Pulse surveys | Trust and clarity signals at end of billing cycle |
| PostHog analytics instrumentation | Event tracking for activation, usage, growth |
| QA and testing | Permission tests, money calculations, workflow coverage |
| LGPD-conscious review | Privacy and data handling audit |
| Deployment and launch prep | Production deploy, monitoring, launch checklist |

---

## Notes for Linear Setup

- Create one **Project** per milestone (M1–M5)
- Create **Issues** for each feature within the corresponding project
- Larger features should be broken into sub-issues during implementation
- Use **Labels** for feature categories: `auth`, `properties`, `charges`, `statements`, `ingestion`, `tenants`, `payments`, `notifications`, `analytics`, `infrastructure`
- Set milestone target dates based on the roadmap timeline
- Link the GitHub repo so branch/PR automation works
