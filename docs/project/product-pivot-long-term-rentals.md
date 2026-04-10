# Mabenn Product Pivot: Long-Term Rental Management

**Date:** 2026-04-10
**Context:** Meeting with Alex (2026-04-09) identified a larger market opportunity

---

## Why the Pivot

### Previous target
Small-time landlords with a few properties and short-term rentals where all bills stay in the landlord's name (landlord's CPF).

### New target
**Long-term rental landlords and tenants** — specifically small-time landlords who don't want to pay ~8-12% for professional property management, want to handle their own tax reporting (rather than having a property manager automatically report to Receita Federal), but still need structure, visibility, and peace of mind.

### Key insight
In long-term Brazilian rentals:
- Landlords **transfer utility charges to the tenant** (electric, water, gas, internet, condo fees)
- Tenants receive bills in their own name, pay them monthly, plus rent
- Tenants sometimes (but not always) notify the landlord that bills are paid
- Contracts are typically **18-30 months** with **annual IPCA-based rent adjustments**
- Landlords frequently forget adjustment dates and contract expiration
- Missed rent / eviction processes are strict and intimidating for small landlords
- This market is significantly larger than short-term rentals
- Some landlords may still keep bills in their own name — the platform supports both models

### The property management fee + tax problem

Property management companies in Brazil charge ~8-12% of rent as a management fee. On top of that, they **automatically report rental income to the tax authority (Receita Federal)**, which triggers income tax obligations of up to 30% depending on the landlord's income bracket.

Many small landlords would rather handle tax reporting themselves — some prefer to avoid reporting rental income altogether. But managing rental contracts, adjustments, late payments, and compliance is complex enough that they feel stuck choosing between:

1. **Pay the management fee** (plus forced tax reporting via the property manager) — expensive and removes control
2. **Do everything manually** — free but error-prone, stressful, and risky when things go wrong

**The opportunity:** A platform that provides the contract management, billing visibility, and compliance tooling that property managers offer — without the management fee and without automatically reporting to tax authorities. Mabenn doesn't touch tax reporting. The landlord retains full control over their own tax obligations.

---

## New Product Shape

Mabenn becomes a **long-term rental management platform** for landlords and tenants. Three pillars:

### Pillar 1: Billing Transparency & Payment Automation

**Problem:** Landlord has no visibility into whether tenant is paying bills. Tenant has no easy way to prove they're current. Both rely on informal communication.

**What we do:**
- Automate monthly bill tracking for the rental property (utilities, condo fees, rent)
- Both landlord and tenant see what's due each month and when it's paid
- Landlord doesn't need to rely on tenant manually reaching out — peace of mind
- Tenant gets credit for being responsible — proof of payment history

**Revenue visibility for landlords:**
- Show how much the landlord is making each month (rent minus any landlord-covered charges)
- Show cumulative revenue over time — throughout the year, lifecycle of the contract, and overall for the property
- Make this feel rewarding — watching revenue grow over the contract lifecycle
- Consider gamification elements to make the financial tracking engaging

**How this connects to our DDA / Open Finance research:**

Brazil has two separate billing instruments, and they behave differently:

| Bill type | Payment instrument | Examples | Auto-discoverable by CPF? |
|---|---|---|---|
| Condo fees, loans, tuition | **Boleto bancario** | Condo admin, bank loans | Yes — via DDA (Celcoin API) |
| Utility bills | **Guia de convenio** | ENEL, Sabesp, Comgas, Vivo | No — not in any centralized system |

**Bill discovery (knowing a new bill exists):**
- **Condo fees** (boletos bancarios) can be auto-discovered via DDA. We register the CPF (tenant's or landlord's, depending on who owns the bill) through Celcoin's DDA API, and we receive webhook notifications when new boletos are issued to that CPF. No bank login required — just CPF + a signed adhesion term.
- **Utility bills** (convenio guides) cannot be auto-discovered through any existing platform. They flow through a completely separate system that has no CPF-based lookup for non-bank companies. For these, bill discovery still requires manual action: the user uploads the bill, forwards it via email, or we extract it from a photo/PDF.
- **Rent** is not a bill issued by a third party — it's defined in the contract. We know the amount and due date from the contract terms.

**Payment detection (knowing a bill was paid):**
- **Both the landlord and tenant connect their bank accounts** via Open Finance (OAuth through Pluggy or Belvo). This gives us transaction-level visibility into both sides:
  - **Tenant's bank:** We see when the tenant pays utility bills, condo fees, and rent. Transactions include the provider's CNPJ, amount, date, and type (`CONVENIO_ARRECADACAO` for utilities, `BOLETO` for condo fees, `PIX`/`TED`/`BOLETO` for rent).
  - **Landlord's bank:** We see when rent lands in the landlord's account (incoming Pix/TED/boleto). We also see if the landlord pays any bills they've kept in their name.
- We match transactions to charge instances using provider CNPJ + amount + date window. High-confidence matches auto-mark as paid; ambiguous ones surface for one-tap confirmation.
- This works regardless of who holds the bills — if the landlord keeps utilities in their name, we detect payments from the landlord's bank feed instead of the tenant's.

**What each connected bank account gives us:**

| Account | What we detect | How |
|---|---|---|
| Tenant's bank | Tenant paid electric bill | `CONVENIO_ARRECADACAO` debit matching ENEL's CNPJ |
| Tenant's bank | Tenant paid condo fee | `BOLETO` debit matching condo admin's CNPJ |
| Tenant's bank | Tenant sent rent to landlord | `PIX`/`TED` debit to landlord's account |
| Landlord's bank | Rent received from tenant | `PIX`/`TED` credit from tenant's account |
| Landlord's bank | Landlord paid a bill they kept in their name | `CONVENIO_ARRECADACAO` or `BOLETO` debit matching provider CNPJ |

**What we still can't do automatically:**
- Know that a new utility bill exists before the user tells us or uploads it (convenio system limitation)
- See the bill details (line items, consumption, breakdown) — we only see the payment event (amount + provider + date)
- Guarantee CNPJ is present on every transaction (sometimes absent for batch boleto/convenio payments — we fall back to transaction description text matching)

**Bill ownership flexibility:**
The platform supports both models. When setting up charges for a property, the landlord indicates who holds each bill (landlord or tenant). The payment detection logic follows accordingly — watching the right bank feed for each charge type. If the landlord transfers a utility to the tenant mid-contract, the configuration updates and we start watching the tenant's feed instead.

### Pillar 2: Contract Management

**Problem:** Small landlords forget rent adjustment dates, forget contract expiration, and don't know how to handle late/missed payments properly. The regulatory process is strict and intimidating.

**What we do:**

**Contract lifecycle:**
- Draft new rental contracts from templates (Brazilian standard rental agreement)
- Store contracts as the central record for the rental relationship
- Track key dates: start, annual adjustment, expiration

**Automated reminders:**
- Remind landlord and tenant about upcoming annual rent adjustments
- Remind landlord and tenant about contract expiration / renewal window
- Suggest new rent amount based on Brazilian IPCA inflation index

**Late/missed payment handling:**
- Automate notification flow for late payments (proper notices per Brazilian rental law)
- Generate required paperwork for formal notices
- Guide landlord through the process step by step

**AI-powered knowledgebase:**
- Tenants and landlords can ask questions about their specific contract
- General knowledgebase about Brazilian rental agreements, tenant rights, landlord obligations
- Late/missed payment mitigation strategies
- Eviction process guidance (Lei do Inquilinato — Law 8.245/91)
- Both parties have access — transparency and trust

### Pillar 3: Communication Hub

**Problem:** Landlord-tenant communication happens across WhatsApp, email, phone — scattered and undocumented.

**What we do:**
- Central platform for landlord-tenant communication
- Ask questions, file maintenance issues, make requests
- Documented history — both parties can reference past conversations
- Structured workflows for common interactions (maintenance requests, payment disputes, etc.)

---

## How This Changes the Product

### What stays the same
- Trust-first, transparency-by-default philosophy
- Mobile-first, calm, modern UX
- Brazil-first positioning
- Supabase + Next.js + PostHog stack
- Bill ingestion and extraction (still needed for utility bill discovery)
- Statement/billing visibility for both parties

### What changes

| Aspect | Before (short-term) | After (long-term) |
|---|---|---|
| **Primary user** | Landlord managing bills in their name | Both landlord AND tenant as equal users |
| **Bill ownership** | Bills in landlord's CPF | Usually transferred to tenant's CPF (but landlord may keep some/all) |
| **Contract duration** | Short stays | 18-30 month contracts |
| **Revenue model opportunity** | Billing tool | Rental relationship management platform |
| **Key pain points** | Bill tracking, tenant billing | Payment visibility, contract lifecycle, compliance, communication |
| **Open Finance target** | Landlord connects bank | Both landlord AND tenant connect banks (full visibility into both sides) |
| **Competitive positioning** | Alternative to spreadsheets for billing | Alternative to paying 8-12% for property management |

### New features needed
- Contract management (templates, storage, key date tracking)
- IPCA inflation integration (annual adjustment suggestions)
- Reminder system (adjustments, expiration, renewals)
- Late payment notification workflow (per Brazilian rental law)
- AI knowledgebase (contract-specific + general rental law)
- Messaging / communication hub
- Revenue tracking dashboard for landlords (monthly + cumulative)
- Gamification elements for financial tracking
- Maintenance request workflow

### Features that carry forward (with modifications)
- Property and unit setup
- Charge definitions (now focused on what tenant pays)
- Bill upload + ingestion (whoever holds the bill)
- Open Finance payment detection (both landlord's and tenant's banks)
- Statement/billing transparency (shared view)
- Tenant invites (landlord invites tenant to property)
- Notifications system

### Features that may be deprioritized
- Complex responsibility allocation (simpler in long-term — typically tenant pays everything or clear split)
- Statement drafting/publishing workflow (more automated in new model)

---

## Market Positioning

**Before:** "Stop using spreadsheets to bill your tenants"

**After:** "Everything you need to manage your rental — without paying 8-12% for property management"

### Value proposition by user

**For landlords:**
- See all bills and rent status without chasing the tenant
- Never miss a rent adjustment or contract expiration
- Know exactly how much you're making — monthly and cumulatively
- Handle late payments properly without a lawyer (yet)
- One place for all tenant communication
- Fraction of the cost of property management

**For tenants:**
- Prove you're a responsible tenant (payment history)
- Understand your contract without reading legal text
- Know when your rent will adjust and by how much
- One place to communicate with your landlord
- File maintenance requests with documentation

---

## Open Questions

1. **Pricing model** — Free for tenants, subscription for landlords? Freemium? Per-property pricing?
2. **Contract templates** — Build our own or integrate with existing Brazilian contract platforms?
3. **IPCA data source** — IBGE API? How to get reliable, timely inflation data?
4. **AI knowledgebase** — RAG over Lei do Inquilinato + contract text? Cost implications?
5. **Communication hub** — Build chat or integrate with existing messaging (WhatsApp API)?
6. **Gamification** — What specifically? Streaks, milestones, property portfolio growth visualization?
7. **Eviction/legal workflow** — How deep do we go? Templates only, or guided process?
8. **Migration** — How does existing MVP work transition to the new model?
9. **Maintenance requests** — How structured? Photo uploads, categories, status tracking?
10. **Multi-property view** — Landlord dashboard across all properties showing aggregate revenue?
