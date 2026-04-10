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

**Rent is first class. Property expenses are second class.**

The landlord's primary concern is: "how much money am I making from this property?" Seeing that rent was paid each month is the core value. Revenue tracking — monthly, cumulative, per-contract, per-property — is the centerpiece of the landlord experience.

Property expenses (utilities, condo fees) are important but secondary. The landlord wants to know they're being paid on time and have visibility into late/missing payments, but this supports the revenue picture — it's not the main event.

**What we do:**
- Track rent payment as the primary metric — was it paid, when, how much
- Track property expenses (utilities, condo fees) as secondary — are they being paid on time
- Both landlord and tenant see what's due each month and when it's paid
- Landlord doesn't need to rely on tenant manually reaching out — peace of mind
- Tenant gets credit for being responsible — proof of payment history
- Surface late/missing payments clearly for both rent and expenses

**Revenue visibility for landlords:**
- Show how much the landlord is making each month (rent minus any landlord-covered charges)
- Show cumulative revenue over time — throughout the year, lifecycle of the contract, and overall for the property
- Make this feel rewarding — watching revenue grow over the contract lifecycle
- Consider gamification elements to make the financial tracking engaging

**Tenant reputation system:**
- Tenants earn a rating based on timely payments (rent, utilities, condo fees)
- This rating is portable — if the tenant moves to another landlord on the platform, the new landlord can see their payment history and reliability score
- Creates a real incentive for tenants to pay on time and stay on the platform
- Creates a network effect — landlords want to use Mabenn because they can vet tenants, tenants want to use Mabenn because their good history follows them
- Future expansion: could become a trust signal for rental applications, reducing the need for fiadores (guarantors) or caução (security deposits)

**Landlord reputation system:**
- Landlords earn a rating based on responsiveness to maintenance requests, tenant ratings, dispute resolution, etc.
- Portable across tenants — future tenants can see the landlord's track record before committing to a rental
- Creates a two-sided trust marketplace — both parties have skin in the game
- Incentivizes landlords to be responsive and fair, tenants to pay on time
- Combined with tenant reputation, this positions Mabenn as a trust layer for Brazilian rentals — not just a management tool

**How expenses are captured — three mechanisms:**

1. **Condo fees → DDA (boleto system).** Condo fees are issued as boletos bancarios and can be auto-discovered via DDA (Celcoin API) by registering the tenant's or landlord's CPF. Water is often bundled into the condo boleto — we do not separate it out. The condo fee is treated as one opaque charge. We store the invoice PDF if the user forwards it for transparency, but it's optional.

2. **Utilities → Mabenn-built ingestion flows.** Utility bills (electric, gas, internet, standalone water) are captured through automated bill ingestion — email forwarding, upload, or photo. Some providers have web portals where usage can be looked up by account number or CPF, which Mabenn can use as a validation layer to confirm extraction was correct. Each provider's ingestion and validation flow is built and controlled by Mabenn engineering — this is not user-configurable or AI-driven.

3. **Payment confirmation → Open Finance.** Whether the tenant (or landlord) actually paid each expense is detected via Open Finance — both parties connect their bank accounts, and we watch for matching transactions.

**How this connects to our DDA / Open Finance research:**

Brazil has two separate billing instruments, and they behave differently:

| Bill type | Payment instrument | Examples | Auto-discoverable by CPF? |
|---|---|---|---|
| Condo fees, loans, tuition | **Boleto bancario** | Condo admin, bank loans | Yes — via DDA (Celcoin API) |
| Utility bills | **Guia de convenio** | ENEL, Sabesp, Comgas, Vivo | No — not in any centralized system |

**Bill discovery (knowing a new bill exists):**
- **Condo fees** (boletos bancarios) can be auto-discovered via DDA. We register the CPF (tenant's or landlord's, depending on who owns the bill) through Celcoin's DDA API, and we receive webhook notifications when new boletos are issued to that CPF. No bank login required — just CPF + a signed adhesion term.
- **Utility bills** (convenio guides) cannot be auto-discovered through any existing platform. Unlike boletos, there is no centralized registry for convênio guides — each utility company manages its own billing independently, so there is no CPF-based lookup available to anyone. For these, bill discovery still requires manual action: the user uploads the bill, forwards it via email, or we extract it from a photo/PDF.
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

**Provider coverage is region-specific:**

Utilities vary by region (Florianopolis electricity = Enliv, Sao Paulo electricity = ENEL, etc.). During property setup, Mabenn derives the utility providers from the property address and presents them as defaults. The user confirms or changes them. If a provider doesn't exist in our system, the user is notified with clear UX (not a dead end) and prompted to upload an example bill so engineering has what they need to build the ingestion flow. Mabenn engineering is alerted — ideally with an automatic Linear ticket (with the example bill attached) so the provider build gets tracked and prioritized.

Every provider's data extraction flow is built by Mabenn engineering. Quality and accuracy are controlled, not crowd-sourced or AI-guessed.

**Ingestion error handling:**

When extraction runs and fails or produces suspect results, both engineering and users must be notified. Engineering needs error visibility for debugging and improving flows. Users need a well-thought-out UX that explains what happened and what to do (re-upload, manually enter, wait for fix). Not just a generic error state.

**Release strategy:**

Since rent is first class and works everywhere (contract terms + bank feed), a full Brazil release is possible even without complete provider coverage. The key requirement is excellent UX for regions and providers we don't yet support — transparent about what's available, what's coming, and persistent nudges to complete expense setup since it adds real value.

A full Brazil release also gives us analytics-driven prioritization: we can track where users are signing up, which providers are being requested, and how many properties are blocked on missing providers — then focus engineering effort on the highest-demand regions first. Controlled release by region is also an option if we want a polished experience everywhere from day one. Either way, a system must exist to surface missing providers and alert engineering.

**Friction points:**

1. **Tenant won't connect bank account** — we lose the primary payment detection mechanism for expenses. Need fallback options (manual confirmation, LL bank feed if available).
2. **Tenant/LL won't set up utility providers** — can't show expense payment status without knowing which providers to track. Need good "not yet configured" UX with nudges to complete setup.
3. **LL won't connect bank account** — if tenant also didn't connect, we can't verify rent payment at all. Need UX for this edge case.
4. **Open Finance regulatory unknowns** — using Pluggy/Belvo for bank account hookup may involve red tape, approvals, or timeline risks. Needs targeted research: what does it take to go live, what's the timeline, what are the blockers?
5. **Users won't manually validate extracted expense values** — we could ask users to confirm extraction results, but this is friction they'll likely ignore. Provider web portal cross-checks (automated) are more reliable than user validation.

**Mitigating friction through gamification and reputation:** Many of these friction points (connecting bank, setting up providers, validating expenses) could be incentivized by tying them to the user's reputation score. Completing setup steps, connecting your bank, and confirming expense data could all contribute to a higher trust rating — giving both landlords and tenants a reason to engage rather than skip.

---

### User Onboarding

1. Sign in (Google OAuth or email/password)
2. Profile setup: name, avatar, CPF
   - Google sign-in pre-fills name and avatar — user can change
3. Done

### Property Creation

1. **Enter property address** — from this we derive utility providers for the region
2. **Set up rent and expense charges:**
   - **Rent:** Amount and due date from contract terms
   - **Utility providers:** Auto-detected from address, user confirms or changes. If a provider isn't in our system, user is notified and engineering is alerted
   - **Condomínio:** Presented as a suggested expense (see condo fee setup below). If the user removes it or skips it, that's fine — either not a condo or they'll do it later
3. **Invite tenant** (skippable — LL may set up property before having a tenant or before they're ready to invite)

No "is this a condo?" toggle or property type selection. The charge setup implicitly tells us what kind of property it is based on which expenses the user keeps. The product works progressively — user can set up just rent on day one and add expenses later.

### Condo Fee Setup — Barcode Capture

When the user enables "Condomínio" as an expense, we need the administradora's CNPJ to register for DDA. We get this from the boleto barcode.

**On mobile:**
1. **Primary:** Open camera → scan barcode
2. **Fallback:** Upload a photo of the barcode from gallery
3. **Fallback:** Manually type the linha digitável (47 digits)

**On desktop:**
1. **Primary: "Scan with your phone"** — prominent, the encouraged path
   - QR code or short link displayed on screen
   - User opens link on phone → camera opens → scans boleto barcode
   - Phone shows: "Got it. You can close this page."
   - Desktop updates seamlessly via Supabase Realtime — no refresh needed
   - Phone session is capture-only — no navigation, no continuing setup from phone
2. **Fallback:** Upload a photo of the barcode
3. **Fallback:** Type the linha digitável manually

**After capture (any method):**
- Extract issuer CNPJ + name + amount from the barcode
- Show confirmation: "Your condo is managed by [Administradora Name] — R$[amount]/month. Correct?"
- Register CPF for DDA to auto-discover future condo boletos

Barcode scanning is only used for condo fee setup. Utility charges don't need it — we already know the provider from the address, and utilities are convênio guides (not boletos) so there's no DDA registration to do.

**Condo fee invoice PDF:** Each property has a dedicated ingestion email. We nudge the user to forward their condo statement to that email for record-keeping. Optional — DDA handles amount + due date + payment status without it.

**Water:** Water is always presented as its own expense charge during setup, regardless of property type. If the user fills it in, we track it as a standalone utility. If they skip it, that likely signals water is bundled into the condo fee — and that's fine. Either way, no extra questions or toggles needed. The user's choice implicitly tells us how water is handled for that property.

---

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
- Statement drafting/publishing workflow (more automated in new model)

### Features that stay as-is
- Charge splits (roommates sharing a unit, partial responsibility between LL and tenant)

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
