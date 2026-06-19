# Positioning & Messaging Foundation

> Source-of-truth document for AI-generated marketing copy, content, and UI direction for Mabenn. Describes the mature product vision — what we are saying Mabenn is — not the day-one shipped scope.

## 1. Product Summary

### One-sentence description
Mabenn is property management without the property manager — a Brazil-first rental platform for landlords who self-manage and the tenants they rent to.

### Slightly expanded description
Mabenn lets small Brazilian landlords do the work of a property manager without paying one. It drafts new rental contracts from Brazilian templates and keeps them as the central record of the relationship. It watches both sides' bank accounts to confirm rent and bill payments, finds new bills the day they're issued, reminds both sides when rent or a bill is due, proposes the annual IPCA adjustment, tracks renewals and expirations, and drafts every notice required by the Lei do Inquilinato when things go wrong. The rental conversation — maintenance, contract questions, negotiations, disputes — lives in Mabenn next to the rental it's about. An AI assistant trained to explain Brazilian rental law and your specific contract handles the everyday questions for both sides — for complex disputes, a lawyer is still the right call. Landlords and tenants build portable reputations they carry from one rental to the next. It runs in the background and surfaces only when action is needed.

### What the product is not

> **Internal alignment only — do not use this framing in marketing copy.** A "what we are not" list on a landing page hands competitors a feature-gap map and makes the product sound defensive. The list below is for internal positioning discipline.

- Not a property-management company. We do not act as an intermediary between landlord and tenant.
- Not a payment processor. Money does not move through Mabenn — we observe, we don't intermediate.
- Not an accounting tool or ERP. We are not the spreadsheet, the ledger, or the dashboard for a real-estate business.
- Not a rental marketplace. We do not list properties or match tenants to landlords.
- Not a general messaging app. The rental conversation lives in Mabenn, scoped to the rental. We're not your inbox.
- Not AI-first. The AI assistant is a feature inside the product; Mabenn is not "AI for landlords."

### Brand mark

- **Wordmark:** lowercase `mabenn` — used only in the logo and the footer wordmark.
- **Prose, headlines, and meta:** sentence-case `Mabenn` — everywhere else (body copy, headings, page titles, meta descriptions, OG text).
- **Never** all-caps `MABENN`, and never lowercase `mabenn` inside a sentence.

---

## 2. Audience

### Primary audience — Small Brazilian landlords who self-manage
Owners renting out their own properties. They self-manage today because property managers are expensive and force tax reporting. They are moderately tech-comfortable, comfortable with bank apps and WhatsApp, not comfortable with property-management software or accounting tools. They want structure and peace of mind without a manager between them and their tenant. Portfolio size ranges from a single inherited apartment to a small handful of investment properties — the product serves all of them.

**Co-ownership is supported.** Married couples, siblings who inherited together, family-owned investment properties — multiple landlords on the same property is a real case in Brazil, not a corner case. Each co-owner has their own login and equal visibility on the property they share.

### Secondary audience — Small imobiliárias and independent agents
Small Brazilian imobiliárias and independent real estate agents managing properties on behalf of landlord clients (roughly 1–20 properties per agent). They get the same product, same positioning — the landlord-tenant relationship is still the spine, and the manager is an authorized actor on the landlord's behalf. Marketing copy stays landlord-facing; the product accommodates this audience naturally through permissions and multi-property views.

### Secondary audience — Tenants
Adults renting and paying rent plus one or more utility bills in their own name. They can sign up two ways: invited by their landlord, or **solo** — entering their own property, connecting their bank, adding the landlord's CPF, and (optionally) inviting their landlord from inside the product. Either way, bank connection is the gate. In exchange, they stop being the one who has to remember and prove: every payment is timestamped by the bank, every conversation is logged, every bill is clear. Maintenance and contract conversations live in Mabenn with documented response times. Over time, they build a verified payment record they can show any future landlord — Mabenn or not. They are typically more tech-comfortable than the landlord. They are equal users in the product, even though the typical paying decision is the landlord's.

**Shared rentals are supported.** Multiple tenants on one rental — couples, roommates, repúblicas — each connect their own bank and appear on the same rental. Rent share, bill share, and reputation are per-tenant. The rental is the shared object; the tenants are individual users on it.

**Tenants are a growth lever.** Every solo tenant signup is a potential landlord invite — they bring Mabenn to the person who owns the property. The tenant side is free forever and full-featured precisely because tenants pull landlords in.

### User roles / personas

| Role | What they care about | How they enter the product |
|---|---|---|
| **Landlord (LL)** | **How much am I making — this month, this year, lifetime, per property.** Is rent landing? Are bills getting paid? When is the next adjustment? When does the contract end? | Self-serve sign-up from the landing page |
| **Imobiliária / independent agent** | Same as landlord, multiplied across their book. Plus: can I show my client what's happening with their property? | Self-serve sign-up; manages properties on behalf of landlord clients |
| **Co-landlord** | Same as landlord, on a co-owned property (couple, siblings, family). Same dashboard, same numbers, own login. | First co-owner signs up; they invite the others |
| **Tenant** | What do I owe this month? Is my payment history visible? When will rent adjust and by how much? Did the landlord see my maintenance request? | Invited by their landlord — or solo self-serve sign-up (with optional landlord invite from inside the product) |
| **Co-tenant** | Same as tenant, on a shared rental (couples, roommates, repúblicas). Each connects their own bank, shares or splits bills, builds their own reputation. | Invited by the first tenant on the rental — or signs up solo and invites the others |
| **Future tenant / future landlord** | Can I see the other party's reputation before signing? | Joins the platform to read a partner's record (network-effect entry point) |

### Buyer roles
**Primary buyer = landlord (or imobiliária acting for one).** Tenants are free forever and can sign up solo or by landlord invite — they are users but not buyers. There is no separate procurement contact; this is a consumer-feeling product even though the paying decision is landlord-leaning.

### Audience sophistication level
- They understand: rent, IPCA, condomínio, boletos, Pix, fiador, caução, Lei do Inquilinato, the cultural fact that property managers report income to Receita Federal.
- They should not need to understand: Open Finance, DDA, Celcoin, Pluggy/Belvo, OAuth, webhooks, CNPJ matching logic, or anything about how the automation works under the hood. These are the *mechanism* — never the *feature* — in copy.
- Marketing copy assumes Brazilian context. PT-BR institutional terms (IPCA, Lei do Inquilinato, fiadores, caução, condomínio, boletos) keep their PT-BR form in all locales — they are proper nouns. EN/ES copy may add a short gloss in parentheses where helpful, but never invent equivalents.

---

## 3. Core Problem

### The two-bad-options trap
Brazilian landlords with a few rental properties are caught between two bad options:

1. **Hire a property manager.** Pay 8–12% of every month's rent — for the rest of the time you own the property — to a company whose actual work is mostly tracking, paperwork, and chasing payments. The manager automatically reports your rental income to Receita Federal, which can trigger income tax obligations of up to 30%. You lose money and control in the same transaction.
2. **Do it all yourself.** Track rent in a spreadsheet. Calendar the annual IPCA adjustment in your head. Ask the tenant on WhatsApp whether they paid the condo and the electric bill this month. Forget the renewal window. When rent comes in late, look up the Lei do Inquilinato and try to figure out what notice you're supposed to draft. Hope you got it right.

### Current broken workflow
- Rent payments are tracked in memory or a spreadsheet. The landlord doesn't actually know if April's rent landed without checking the bank app.
- Utility and condo bills are in the tenant's name. The landlord has no way to verify they're being paid on time — only their own anxiety.
- IPCA adjustment dates are kept in a calendar reminder, an email thread from the original contract signing, or nowhere at all.
- Late payments turn into uncomfortable WhatsApp messages and improvised notices that may not hold up legally.
- When something goes legally wrong — late rent, a formal notice, eviction proceedings — the landlord calls a lawyer. Lawyer fees on a single late-payment cascade can erase a year of management-fee "savings."
- "How much did this property make last year?" — the landlord works it out themselves. Usually a spreadsheet, sometimes just memory and a bank app.
- Communication is scattered across WhatsApp, email, and SMS. There is no record.

### Manual workarounds
- Spreadsheets to track rent and adjustments.
- Calendar reminders for renewal windows that get snoozed.
- WhatsApp threads with tenants asking "did you pay the condo this month?"
- Screenshots of Pix receipts forwarded between landlord and tenant.
- Googling Lei do Inquilinato when something goes wrong, then second-guessing the result.
- For tenants: trying to prove to a new landlord that they're reliable — without any portable record.

### Emotional and business frustration
- **For landlords:** chronic low-grade anxiety. Money is involved, the law is complex, the relationship is personal. Every late payment is uncomfortable. Every forgotten adjustment is money left on the table. Every contract end is a deadline they didn't track.
- **For tenants:** the feeling of being treated as a risk by default. Strong payment history doesn't transfer between landlords. Fiadores and caução exist because there is no better way to prove you're reliable. Disputes happen over informal records.
- Both sides distrust each other more than the relationship deserves, because the system gives them nothing to trust.

### Why existing approaches are insufficient
- **Property managers** solve the work but at a permanent 8–12% cost, plus forced tax reporting. The math gets worse every year you own the property.
- **Spreadsheets** are free but fragile, manual, and easy to mistrust on both sides.
- **WhatsApp** is fast but undocumented. No record means no proof.
- **Brazilian rental admin platforms (Superlógica, Owli)** target imobiliárias, not individual landlords — heavy operationally, built for a business model the small landlord isn't running.
- **Managed marketplaces (QuintoAndar)** require giving up control of the rental and pricing.
- **Global property-management suites (Buildium, AppFolio, DoorLoop)** treat the small Brazilian landlord's workflow as a corner case inside a much larger system, with no awareness of IPCA, Lei do Inquilinato, fiadores, or boletos.
- **Utility-billing specialists (Zego, Conservice)** target large multifamily operators, not individual owners.

### Consequences of doing nothing
- Hundreds of reais per month leaving the landlord's pocket — every year they own the property — to pay for admin work that is mostly automatable.
- Missed adjustments. A landlord who forgets the annual IPCA bump for one year often forgets for two, then three. Compounded over a 20+ year hold, that's tens of thousands of reais.
- Tenants stuck behind fiadores and caução even when their payment record is impeccable.
- Bad situations (late rent, dispute, eviction) handled informally, then improperly, then expensively. A single eviction can cost a self-managing landlord thousands of reais in lawyer fees — on top of the months of unpaid rent that triggered it.

### Two audiences, same trap
Most Brazilian landlords already self-manage — not because they chose to, but because the manager fee felt worse than the spreadsheet. The DIY landlord isn't paying 8–12% today; they're paying in evenings, lawyer bills, and missed adjustments. **Mabenn serves both** — the landlord leaving a manager and the landlord who never hired one. The 8–12% wedge is the cleanest hook for the PM-leaving segment; the time-and-anxiety wedge is the cleanest hook for the DIY segment. Most marketing pages should name both, even if the headline leads with one.

---

## 4. Product Promise

### Core promise
**Property management without the property manager.** You handle the property. Mabenn handles the work a manager would charge you 8–12% to handle — tracking, contracts, paperwork, reminders, visibility. You stay in control of your property, your income, and your tax obligations.

### Why reputation = revenue
The reputation marketplace isn't decoration — it's how Mabenn becomes more valuable every year you use it. A higher landlord rating means tenants want to rent from you. Less vacancy. More months earning. Fewer rounds of fiador chasing. A higher tenant rating means landlords reduce the friction at signing — smaller caução, less paperwork. The rating isn't vanity. It's cash flow. For both sides.

### Before / after transformation

| Before Mabenn | After Mabenn |
|---|---|
| Find a contract template online, edit it in Word, ask the tenant to sign a PDF | Draft the contract in Mabenn from a Brazilian template — it becomes the central record from day one |
| Spreadsheet, WhatsApp, mental calendar | One place — both sides see the same view |
| "Did you pay the condo this month?" | Mabenn saw it clear three days ago |
| Forgot the annual adjustment again | Mabenn proposes the new rent at IPCA, sends it to the tenant for review |
| Call a lawyer when rent is late | Mabenn drafts every notice the Lei do Inquilinato requires |
| Pay a lawyer to prepare eviction paperwork | Mabenn drafts what the lawyer would otherwise prepare. The lawyer still files. |
| "How much did this property make last year?" | A chart. R$ 28.400. +12% vs last year. Three properties contributing. |
| Pay 8–12% of every rent check to a property manager | Flat monthly. No percentage. You keep the relationship and the math works the same every month. |
| Tenant pays on time for three years, then moves and starts from zero | Tenant's payment history travels with them |
| Landlord's responsiveness is invisible to the next tenant | Landlord's record travels too |

---

## 5. Positioning Statement

### Main positioning statement
For small Brazilian landlords managing their own properties and the tenants who rent them, **Mabenn** is **property management without the property manager** — a rental platform that helps both sides handle the contract, the tracking, the paperwork, and the trust by **watching both bank accounts, finding bills automatically, managing the contract lifecycle, and keeping every conversation about the rental in one place**, unlike property managers, who charge 8–12% of every rent check and step in between you and your tenant, and unlike spreadsheets and WhatsApp, which give you no record and no protection when something goes wrong.

### Hero-ready version

> Property management without the property manager.
>
> *Subhead:* Rent tracking, contracts, and the lifecycle paperwork — for Brazilian landlords who'd rather keep the 8–12%.

---

## 6. Messaging Pillars

**Four pillars.** Pillar 1 is the landlord's headline value — the emotional center of the landing page. Pillars 2 and 3 are the product's operational engine (tracking + contract). Pillar 4 covers the two-sided design — reputation and shared conversation rolled into one beat.

The fee/control wedge (formerly Pillar 5 "You stay in control") is not a pillar — it's the comparison closer at the end of the page. The disruption shows in the contrast, not in claims about ourselves.

**Note for AI copy generation:** Not every surface needs all four. Pillar 1 (revenue) is the landlord's *emotional* anchor — the headline value — but on the refreshed canonical landing page (2026-06; see the §11 callout) it is no longer a standalone mid-page pivot: it's folded into the **Reporting** feature section and carried strongly by the hero visual. The page is now task-led (jobs grid → how it works → feature run), not pillar-led. Other surfaces (about page, feature pages, blog) can still lead with any single pillar, including a dedicated revenue moment where it earns its place.

---

### Pillar 1 — Watch your rental income grow

**Core idea:** Every paid rent, every cleared bill, every adjustment rolls up into the only view that really matters to the landlord: how much they're making. This month. This year. The lifetime of the contract. Across all properties or zoomed into one. **This is the emotional center of the landlord experience and the headline value of the product.**

**Why it matters:** A property is an investment. The landlord wants to see it grow. Spreadsheets show numbers; Mabenn shows a story — sourced from real bank payments, not memory. Nothing else in the Brazilian rental space leads with this.

**Example headline + supporting copy:** see Section 13 → Pillar supporting copy.

---

### Pillar 2 — Rent and bills, seen automatically

**Core idea:** Connect the bank accounts. From that moment on, Mabenn sees every payment as it happens — rent landing, condo cleared, electric paid. Bills get found the same way: boletos show up the day they're issued; utility bills arrive at a Mabenn email address you give your providers once.

**Why it matters:** This is the work property managers charge for. Mabenn does it passively. The landlord stops chasing the tenant; the tenant stops being treated like a suspect. Neither side enters anything.

**Example headline + supporting copy:** see Section 13 → Pillar supporting copy.

---

### Pillar 3 — The contract, end to end

**Core idea:** Draft the contract in Mabenn from a Brazilian template. From that point on, every key moment is tracked — annual IPCA adjustments, renewals, expirations, every charge due date. If rent goes late, Mabenn drafts every notice the Lei do Inquilinato requires — and prepares the paperwork your lawyer would otherwise draft if it escalates to eviction. An AI assistant trained to explain Brazilian rental law and your specific contract handles the everyday questions from both sides.

**Why it matters:** Self-managing landlords forget adjustments, miss renewals, and call a lawyer when rent goes late. Mabenn drafts the routine paperwork a lawyer would otherwise prepare — and replaces the calendar reminder for everything else. For the courtroom cases, the lawyer is still there.

**Example headline + supporting copy:** see Section 13 → Pillar supporting copy.

---

### Pillar 4 — Built for both sides

**Core idea:** Both landlord and tenant are first-class users. Same record, same billing view, same contract, same everyday answers from the AI. The rental conversation — maintenance requests, contract questions, end-of-term negotiations, disputes — lives in Mabenn next to the rental it's about, scoped to the rental, visible to both sides. Over time, both sides build a verified, event-driven reputation — bank-event-derived and shareable with any future landlord, Mabenn or not.

**Why it matters:** Two compounding moats live here. **The shared record** is what makes communication credible — when something goes wrong, both sides have receipts by default. **The portable reputation** is the network effect — it's what makes Mabenn worth more on the second rental than the first, and it's something no property manager can offer. A higher landlord rating means tenants want to rent from you — less vacancy, more months earning. A higher tenant rating means less caução and faster signings. The rating isn't vanity; it's cash flow.

**Example headline + two-column supporting copy (landlord/tenant):** see Section 13 → Pillar supporting copy.

**Supporting beat — every conversation, one record:**
> Mabenn is where the rental conversation lives. Maintenance requests, contract questions, end-of-term negotiations, disputes — all in one place, tied to the rental they're about. Not a general messaging app. Not your inbox. The record of this rental. When something goes wrong, the side with documentation wins; Mabenn gives both sides documentation by default.

**Supporting beat — reputation that follows you:**
> In Brazil, a good tenant gets stuck behind fiadores and caução. A reliable landlord starts each new rental from zero. Mabenn replaces both with verified, event-driven reputations — earned from real bank payments, real reply times, contracts honored. Show your record to any future landlord, Mabenn or not. No fake reviews. No drive-by ratings. Just the receipts.

---

### The closer — All the management. None of the manager.

**Not a pillar.** The comparison closer at the end of the landing page, after the four pillars have done their work. Property managers charge 8–12% of every rent check; Mabenn charges flat monthly and never takes a percentage. We're a management tool, not a financial intermediary — money doesn't move through Mabenn, and we don't file anything for you. You keep your property, your income, and your tax obligations under your own roof.

**Example headline + supporting copy:** see Section 13 → Pillar supporting copy.

---

## 7. Differentiators vs Features

> **Features any team can build. Moats only a two-sided rental platform can.**

This section deliberately separates the two. *Differentiators* are the structural moats — things a competitor can't ship in a quarter because they require either a two-sided user base, density, or product-design choices that compound over time. *Features* are everything else — important to the product, table-stakes to the category, copyable in a sprint. Marketing copy should treat the differentiators as the spine of the story and the features as supporting evidence.

---

### Differentiators (structural moats)

| Differentiator | Why it's hard to copy |
|---|---|
| **Two-sided bank linking + matched payment detection** | Mabenn confirms payments from both the landlord's and the tenant's bank feed (Open Finance). A competitor can't just "add Open Finance" — they need both parties to opt in, on the same rental, with switching cost on both sides once they do. Mabenn is the only Brazilian rental product built around two-sided detection. |
| **Two-sided portable reputation, event-driven** | Both landlords and tenants build records from concrete on-platform events (payments cleared, replies sent, contracts honored). Records follow each user to their next Mabenn rental. The moat compounds with density — every rental added makes the next one more valuable to both sides. Property managers can't build this; they don't own the tenant relationship. |
| **One shared record, both sides** | Same live billing view, same ledger, same contract, same answers from the AI — for landlord and tenant. The whole product is built around a *rental* as the shared object, not around one party using software to manage the other. Every competitor in the space treats the tenant as someone the landlord *bills*; rebuilding to this design is a foundational rewrite, not a feature. |
| **Reputation events linked to bank-confirmed transactions** | "Paid rent on time" means a real Open Finance match — not a self-reported claim or a star rating. Credibility comes from the receipts, and the receipts only exist because of the two-sided bank linking above. The moat is the *combination*. |

### Workflow expressions of those moats

- **Passive by design.** Once configured, neither side enters data. Payments, bills, and due dates are detected, not typed in. Most months, neither party engages with the product at all.
- **Reminders only when something needs attention.** Mabenn surfaces the handful of moments per year that matter — a new bill, an adjustment proposal, a late payment, a renewal window — and stays out of the way otherwise.

---

### Features (important; not moats)

These ship the product but don't protect it. Any competent competitor can match each one in a quarter. They earn their place in the copy as evidence — never as the headline claim.

| Feature | What it does |
|---|---|
| **DDA-driven boleto discovery** | Every boleto issued to the registered CPF is auto-discovered the day it lands — condo, insurance, anything billed by boleto. Celcoin (the underlying API) sells DDA access broadly. |
| **Per-property bill ingestion email** | Each property gets a unique inbox address. Point your utility providers there once, every bill flows in for the life of the property. |
| **Brazilian-template contract drafting in-product** | Mabenn drafts the contract from a Brazilian template at the start of the rental. Templates are public; the value is the UX and the fact that the contract becomes the record. |
| **IPCA-anchored adjustment proposals** | Mabenn proposes the annual adjustment at the published IPCA rate and routes it through an explicit landlord-tenant review and accept step. IPCA is a public index. |
| **Lei do Inquilinato-compliant notice drafting** | Late-payment notices and escalation paperwork drafted from Brazilian law. For actual eviction filings, Mabenn prepares the paperwork a lawyer would otherwise draft — the lawyer still files the case. |
| **AI assistant trained to explain Brazilian rental law + your contract** | The assistant reads the Lei do Inquilinato and the specific contract attached to your rental. Both sides can ask, both see the same answer. The pattern is standard RAG; the *corpus* (jurisprudence + contract specifics) is where depth accrues over time. For complex disputes, a lawyer is still the right call — the assistant handles the everyday questions, not the courtroom ones. |
| **Bill-ownership flexibility per charge** | Each bill (rent, condo, electric, water, gas, internet) can be held by either the landlord or the tenant. Payment detection follows the right bank feed automatically. |
| **Multi-party rentals** | Two or more landlords on a single property (co-owners, couples, families) — each with their own login and equal visibility. Two or more tenants on a single rental (couples, roommates, repúblicas) — each connects their own bank, shares or splits bills, and builds their own reputation. The property and the rental are the shared objects; the parties are individual users on them. |

### UX features

- **Mobile-first for real.** Phone-comfortable workflows are the design starting point, not the afterthought.
- **Calm financial UX.** Reference blend: Mercury (whitespace, clean financial dashboards, digestible summaries) and Linear (interaction polish). The product reads more like a consumer financial app than property-management software.
- **Two visual worlds, by design.** The authenticated product uses a teal-on-quiet-neutral palette tuned for billing workflows. The marketing surfaces use a warm dark editorial aesthetic (Fraunces serif, coral/rose accent). Different jobs, different feel.
- **Summary first, detail second.** Every screen surfaces the most important answer at the top — the amount, the status, the next action — before any breakdown.
- **Performance as a product feature.** Instant page shells with section-level streaming. The user clicks; the page is structurally there within tens of milliseconds.

### Data and trust features

- **Revenue visibility as a first-class surface.** Monthly, year-to-date, lifetime, per-contract, per-property. Sourced from real bank payments, not user-entered values. (This is a *feature* — the *moat* underneath it is the two-sided bank linking that makes the numbers credible.)
- **Every extracted bill is auditable.** Every imported bill keeps a link to the source document and a log of any corrections.
- **Monthly ledger is immutable.** Past months freeze. Corrections create new explicit events; they don't silently overwrite history.
- **Brazilian data residency.** Hosted in `sa-east-1` (São Paulo).
- **LGPD-conscious from day one.** Row Level Security on every property-scoped table, audit trails on sensitive mutations, documented retention periods, `/privacidade` policy in Portuguese.
- **Money does not move through Mabenn.** No payment processing, no escrow, no platform fees on payments. We observe; we don't intermediate.
- **Flat monthly pricing, never a percentage of rent.** Mabenn never takes a cut. **R$ 49/month per rental, or R$ 490/year (two months free). First rental is always free. Tenants are free forever, with or without their landlord on the product. Single tier — same product whether you have 1 rental or 30.**
- **Founding members.** Landlords and imobiliárias who sign up through the waitlist get their **first year free on every rental, then R$ 39/month locked for life**. A visible `Founding member` badge appears on their profile and reputation card — it doesn't expire when the locked rate kicks in. The badge is a permanent status signal: this user was here before launch.

---

## 8. Value Propositions

| Value prop | Audience | Problem it addresses | Outcome | Example copy |
|---|---|---|---|---|
| **Watch your income grow** | Landlord | "How much am I making?" answered by spreadsheet math or memory | A live revenue dashboard — monthly, year-to-date, lifetime, per property | "R$ 28.400 this year. +12% vs 2025. Real payments. Real numbers." |
| **Rent and bills, seen automatically** | Both | The landlord doesn't know if bills got paid; the tenant has nowhere to prove they did | Open Finance + DDA + bill ingestion confirm every payment passively | "Mabenn saw it clear yesterday." |
| **No more forgotten adjustments** | Landlord | Missed annual IPCA bumps leave money on the table for years | Mabenn proposes the new rent at IPCA; both sides review and agree in the platform | "Next adjustment · Aug 5, 2026 · R$ 2.800 → R$ 2.937" |
| **Handle late rent without four-figure lawyer fees** | Landlord | Late rent and eviction require formal paperwork most landlords don't know how to draft | Mabenn drafts every notice the Lei do Inquilinato requires — and prepares the paperwork a lawyer would otherwise charge to draft if it escalates. Your lawyer files the eviction. | "Mabenn drafts what the lawyer would prepare." |
| **Ask Mabenn** | Both | Everyday questions about Brazilian rental law or the specific contract require a lawyer or a Google rabbit hole | AI assistant trained to explain the Lei do Inquilinato and the user's actual contract — both sides can ask, both see the same answer; for complex disputes, a lawyer is still the right call | "Both sides ask. Both sides see the same answer." |
| **Verified reputation, on both sides** | Both | Reliable tenants get stuck behind fiadores; responsive landlords have no record to attract better tenants | Event-driven reputation earned from real bank events — show your record to any future landlord, Mabenn or not. Higher landlord rating → less vacancy. Higher tenant rating → smaller caução and faster signings. | "Trust isn't vanity. It's cash flow." / "Build trust. Take it with you." |
| **Flat monthly. No percentage.** | Landlord | Property managers take 8–12% of every rent check, forever | See Section 7 (Features) for the locked pricing structure. Headline: never a percentage. | "All the management. None of the manager." |
| **Every conversation, one record** | Both | Maintenance requests, disputes, and negotiations happen across WhatsApp and email — no documentation when it matters | Conversations live in Mabenn next to the rental they're about — searchable, attributable, never lost | "Never lost in a WhatsApp thread." |
| **Both sides, same record** | Both | Landlord/tenant friction is amplified by separate views of the same situation | Live billing view, ledger, and contract are identical for both parties | "Two sides of the same rental." |
| **Brazilian by design, not Brazilian by configuration** | Both | Global property-management tools treat Brazilian institutions (IPCA, Lei do Inquilinato, fiadores, boletos, Pix) as edge cases | Every Brazilian rental institution is first-class in the data model and the UI | "Built around how renting actually works in Brazil." |

---

## 9. Use Cases

Concrete situations that anchor marketing copy, page sections, blog posts, ads, and social content. Each is built around a recognizable moment — not a feature list.

---

### Use Case 1 — "How much did I make this year?" answered in two seconds

- **User:** Landlord with one or several properties
- **Trigger moment:** End of the year, tax season, or just curiosity. The landlord wants to know what their portfolio actually produced.
- **Workflow:** Open Mabenn → see the year's total at the top of the home screen, cumulative line rising, broken down by property and by contract.
- **Business outcome:** Landlord understands their portfolio as an investment, not a memory exercise. Easier to decide whether to raise rent, sell a property, or buy another.
- **Marketing section angle:** "Watch your rental income grow." Anchor copy on the dashboard mockup. This is the landlord's headline value — lead with it.

---

### Use Case 2 — Bills get paid without anyone asking

- **User:** Landlord + tenant
- **Trigger moment:** Mid-month. The landlord used to send a WhatsApp message asking if the condo got paid. The tenant used to forward a screenshot of the Pix receipt.
- **Workflow:** The tenant pays. Mabenn sees it clear in the tenant's bank feed. Both sides see "Paid · detected today" on the live billing view. Nobody messaged anyone.
- **Business outcome:** Friction the relationship didn't need just stops happening.
- **Marketing section angle:** "You don't enter anything. Your tenant doesn't either."

---

### Use Case 3 — The annual IPCA adjustment, handled in five taps

- **User:** Landlord
- **Trigger moment:** Eleven months into the contract. In the old world, the landlord either forgets entirely or has to look up IPCA, calculate the new rent, write the tenant an awkward message, and hope they agree.
- **Workflow:** Mabenn proposes the new rent at the published IPCA rate. Landlord taps "send." Tenant sees it in Mabenn with the breakdown. Tenant accepts. Done.
- **Business outcome:** Landlord captures every annual adjustment for every year they own the property. Tenant understands exactly why rent went up, in writing, with the math.
- **Marketing section angle:** "Never forget the adjustment again."

---

### Use Case 4 — Rent is two weeks late

- **User:** Landlord
- **Trigger moment:** Rent didn't land on the 5th. It still hasn't landed on the 19th. In the old world, the landlord is now uncomfortable, looking up the Lei do Inquilinato, and considering whether to call a lawyer.
- **Workflow:** Mabenn drafts the formal notice required by the Lei do Inquilinato. Landlord reviews, sends. If it escalates to eviction, Mabenn drafts the paperwork your lawyer would otherwise prepare. The lawyer files.
- **Business outcome:** The landlord handles a difficult situation correctly without spending thousands on a lawyer to draft what is, legally, a templated process.
- **Marketing section angle:** "Handle late rent without four-figure lawyer fees."

---

### Use Case 5 — A tenant's third rental, instant trust

- **User:** Tenant moving to their next apartment
- **Trigger moment:** Tenant is signing a new lease. The landlord wants to know if they're reliable. The tenant has paid every rent on time for three years on Mabenn — possibly having signed up solo, without their previous landlord ever joining.
- **Workflow:** Tenant shares their Mabenn profile link. New landlord (Mabenn user or not) sees `★ 4.92`, 36/36 on-time rent payments verified by Open Finance, no disputes, two completed rentals. The record is bank-event-derived — verifiable on its own, not dependent on the new landlord being on Mabenn.
- **Business outcome:** Reliable tenants get rewarded. Reliable landlords get the tenants they want. Trust pays off from the *second* rental — Mabenn doesn't need marketplace density to make this work, because the record is verifiable on its own.
- **Marketing section angle:** "Build trust. Take it with you."

---

### Use Case 6 — "Ask Mabenn"

- **User:** Either side
- **Trigger moment:** Tenant wonders if a landlord can really enter the apartment unannounced. Landlord wonders how long they have to refund the caução after the contract ends. Both, in the old world, would Google, get a Reddit-thread answer, and remain uncertain.
- **Workflow:** Open the assistant in Mabenn. Ask. It answers from the Lei do Inquilinato and the specific contract attached to this rental — both sides see the same answer. For complex disputes, the assistant flags that a lawyer is the right call.
- **Business outcome:** Confidence in everyday moments that used to require a lawyer's hourly rate or a friend who happens to know.
- **Marketing section angle:** "Ask Mabenn. Both sides ask. Both sides see the same answer."

---

### Use Case 7 — The washing machine broke at midnight

- **User:** Tenant → landlord
- **Trigger moment:** Tenant opens the washing machine on a Sunday night. It's full of water. The pump is dead.
- **Workflow:** Tenant files a maintenance request in Mabenn with photos. Landlord gets notified, sees it in their feed, replies the next morning. The whole exchange — request, reply, resolution date — lives next to the rental.
- **Business outcome:** Maintenance is documented, attributable, and reflected in both sides' response-time records. No "I told you about this two weeks ago" arguments.
- **Marketing section angle:** "Every conversation. One record."

---

### Use Case 8 — Negotiating the next contract

- **User:** Landlord + tenant
- **Trigger moment:** Contract is two months from expiring. Both sides want to renew but need to agree on terms.
- **Workflow:** Renewal window opens in Mabenn. Both sides see the upcoming end date, the current rent, the IPCA-adjusted proposal, and a thread for the conversation. Final terms become the next contract.
- **Business outcome:** Renewal is a structured conversation, not a forgotten deadline followed by a scramble.
- **Marketing section angle:** "Renewals stop being a deadline."

---

### Use Case 9 — Three properties, one dashboard

- **User:** Landlord with multiple properties
- **Trigger moment:** Landlord wants to understand their portfolio — which property is performing, where most of the income comes from, whether to add a fourth.
- **Workflow:** Home screen aggregates revenue, on-time-payment rate, and contract health across all properties. Drill into any single property for its full ledger and contract.
- **Business outcome:** Landlord runs a portfolio, not a stack of spreadsheets.
- **Marketing section angle:** "Across properties or zoomed into one."

---

## 10. Voice & Tone

### Voice principles
1. **Declarative.** State what's true. No conditional hedging. "Mabenn drafts the notice." not "Mabenn can help you draft a notice."
2. **Plain.** No jargon. No SaaS vocabulary. Open Finance, DDA, convênio, CNPJ matching, RAG — all internal terms. Externally: "your bank," "every new bill," "Brazilian rental law."
3. **Confident, not loud.** Quiet conviction. The product is good; we don't need exclamation marks.
4. **Brazilian by default.** Brazilian institutions (IPCA, Lei do Inquilinato, fiadores, caução, condomínio, boleto) are proper nouns. They stay in PT-BR across all locales. Currency is `R$`.
5. **Honest about scope.** Mabenn drafts paperwork; the landlord (or their lawyer, for eviction filings) files. Mabenn observes payments; we don't process them. Mabenn doesn't report income for anyone. Say what we are, plainly.
6. **Both sides.** When describing the product, include both landlord and tenant unless the section is explicitly one-sided. The product is built around the rental, not one party.

### Tone attributes
- Calm
- Confident
- Specific
- Warm (not corporate, not cold)
- Trustworthy
- Disruptive but honest (per the landing-page spec: a punchy *hero* headline, plain body copy, no jargon) — but section headers and list-item titles stay plain noun labels, never editorial sentences (load-bearing guardrail; see §11 and §13). "Punchy" applies to the hero, not to section/item titles.

### How the product should sound
- Like a financial product you actually trust (Mercury at its best)
- Like a tool that respects your time (Linear at its best)
- Like a person explaining something they understand, not a brand performing expertise

### How it should not sound
- Like enterprise B2B SaaS ("transform your rental operations")
- Like generic AI marketing ("AI-powered platform")
- Like a property-management incumbent ("end-to-end solution for rental administration")
- Like a startup pitch deck ("disrupting the R$ X billion Brazilian rental market")
- Like a legal document
- Like an ad

### Words and phrases to prefer

| Prefer | Why |
|---|---|
| "Rent landed" / "Bill cleared" | Concrete, observable events |
| "Mabenn finds / sees / drafts / proposes" | Active, specific verbs |
| "Both sides" | Reflects the two-sided design |
| "Detected today" / "Detected yesterday" | Specific, recent, real |
| "On time" | Has a clear meaning vs late |
| "Your contract" / "Your tenant" / "Your bank" | Direct, possessive, personal |
| "8–12%" | The number we keep coming back to |
| "Receipts" (in the trust context) | Concrete, Brazilian-cultural |
| "Lei do Inquilinato" | Proper noun, stays in PT-BR |
| "IPCA" | Proper noun, stays in PT-BR |

### Words and phrases to avoid

| Avoid | Use instead |
|---|---|
| "Platform" (as a generic positioner) | "Mabenn" |
| "Solution" | Be specific about what we do |
| "Seamless" / "frictionless" / "effortless" | "Automatic" or just describe what happens |
| "Empowering" / "Empower landlords to…" | Just say what the landlord does |
| "Leverage" / "utilize" | "Use" |
| "Manage your rental business" | "Manage your rentals" — "business" oversells |
| "AI-powered" / "intelligent" | Describe what the AI actually does |
| "Stop using spreadsheets" | The pre-pivot wedge; do not use |
| "Disrupting" / "revolutionary" | Disruptive content lives in the headlines; never in claims about ourselves |
| "Best-in-class" / "world-class" | Skip |
| "Avoid taxes" / "skip the tax man" | Legal-risk wording — never. Tax-reporting framing is demoted entirely from headline copy; if it appears at all, the phrase is "you stay in control of your tax obligations." |
| "The AI knows the law" / "Same answers, same source" / "AI legal advice" / "Replaces your lawyer" | Implies authoritative legal interpretation an LLM cannot guarantee. Reframe as reader/explainer: "reads the Lei do Inquilinato," "trained to explain," "both sides see the same answer." Always pair with a caveat that complex disputes still need a lawyer. The assistant handles everyday questions; it does not replace counsel. |
| "Mabenn drafts the eviction paperwork. You file it." | Overclaims Mabenn's role in a judicial process. Use "Mabenn drafts the paperwork your lawyer would otherwise prepare — the lawyer files." Routine late-rent notices are templated and can be drafted by Mabenn; eviction filings are a courtroom matter. |
| "Everything a property manager does" | Overclaim. Property managers also find tenants, run viewings, screen applicants — things Mabenn doesn't do. Use "the management" or "the admin a property manager does" or "property management" as the noun. |
| "Long-term rentals" | Just "rentals." Aluguel implies long-term in PT-BR. |
| Emoji of any kind | The aesthetic carries the warmth. |
| Exclamation marks | Per the editorial reference: "No exclamation marks." |
| Sentence-case-violating ALL CAPS | Sentence case throughout. The exception is structural meta labels (`01`, `STEP 1`) that the editorial reference allows. |

---

## 11. Website Narrative

Recommended narrative flow for the public-facing homepage and other marketing pages. Each section below describes the **pattern** an AI can generate from — followed by the concrete mapping to the current canonical landing page (per `docs/superpowers/specs/2026-05-22-landing-page-pivot-redesign-design.md`).

Not every marketing page needs all of these sections. Use the order as a default sequence and drop sections that don't earn their place on a given page.

> **Canonical landing page refreshed (2026-06) — task-led IA.** The home page was reworked for clarity, conversion, and attribution per `docs/superpowers/specs/landing-page-clarity-seo-refresh.md`. That spec's §3 is now the authority for the canonical page's section order; the pattern sections below remain valid generation templates, but the canonical page no longer follows the old pillar-led "eight-section default" (1 Hero → 2 Problem → 3 Solution → 4 How it works → 5 Workflows → 6 Revenue moment → 7 Comparison → 8 Two-sides → 9 CTA). What changed:
>
> - **Task-led, jobs-before-mechanisms.** The page opens with the literal jobs — Hero → **Quick jobs grid** (6 cards: Rent & bills · Reporting · Contracts · Maintenance · Messages · Everything in one place) → **How it works** (4 steps) — then the feature run, *then* comparison / pricing / trust. The mechanism (how detection works) never precedes the job it serves. The hero H1 is now the task itself — **"Manage your rental without a property manager."** / *"Administre seu aluguel sem imobiliária."* — not the brand line. "Property management without the property manager." stays alive as the OG/social hook and the comparison-closer rhyme, not the H1.
> - **Revenue is one job among several, folded into Reporting.** The old "revenue moment climaxes mid-page" staging is retired. Revenue now lives inside a broader **Reporting** feature section: revenue (month/year/lifetime) + costs (condo, IPTU, maintenance, mortgage) + net return after costs + estimated property value + current rent benchmarked against comparable properties. Revenue stays the strongest single element of the hero visual and the Reporting mockup, but it is no longer a standalone emotional-pivot section. For landlord copy, "lead with revenue" still means emotional priority, not literal scroll position.
> - **Hero has a quieter secondary CTA.** Primary `Join the waitlist`; secondary ghost **`See how it works`** that scrolls to the How-it-works section. Pattern for any landlord landing page: one loud primary + one quiet anchor secondary.
> - **Feature sections carry ordinal eyebrows** (`01`–`05`) and a plain noun-phrase headline (see the guardrail below). Order: 01 Rent & bills → 02 Contracts → 03 Messages & maintenance → 04 Reporting → 05 Track record & screening → Comparison → Pricing → Two-sided → Trust & security → Founder → FAQ → Final CTA.
> - **Trust band, founder beat, and FAQ now ship** (the §11.8.3 / 8.5 / 8.7 "not yet on the page" notes are superseded). Trust & security sits after Two-sided, before Founder; the founder beat is a real two-founder bio (Brandon + Lucas); FAQ is 12 questions in visitor-concern order.
> - **Progressive waitlist (in progress).** The inline email input becomes the gate: submitting an email opens a `ResponsiveModal` with richer lead fields (role, rental count, current workflow, optional note) plus first-touch UTM capture. The single-field form described in §11.9 is the current shipped behavior; this enhancement replaces it when the slice lands.
> - **Sell-as-shipped (D1)** — already the doc's position (Conflict #3, §14 avoid-list); the refresh reaffirms it. No availability/automation hedging; keep only honest, load-bearing trust statements (read-only bank access, never moves money, doesn't show the other side's bank feed, a lawyer is still the right call for complex disputes).
> - **Plain headers and plain list-item titles (copy guardrail).** Section headers are plain noun labels that match the jobs-grid card ("Contracts", "Messages & maintenance", "Reporting", "Track record & screening") — not editorial sentences. **List-item titles follow the same rule** (e.g. Reputation / Shareable anywhere / Tenant screening — never "Trust that's earned — and easy to check"). A small amount of editorial language in body copy is fine; headers and item titles stay straightforward.
> - **No new rule/skill (D7).** This guidance doc is the only place the refresh is recorded.

**The canonical landing page is landlord-focused.** Tenant value is carried in the two-sides use-cases section (Section 11.8 below; canonical landing page Section 7), but the page sells to the landlord. A dedicated tenant-facing page will be built in a future cycle.

**This document is landlord-leaning by default.** Where a section says "lead with X" or shows example copy without qualification, it assumes the landlord (or imobiliária) audience. When generating a **tenant-focused page**, invert the defaults:

- **Lead** with the portable, bank-verified payment record — the receipts the tenant carries to their next rental (Pillar 4's tenant column + Use Case 5), not revenue.
- **Reorder** the narrative: trust / portable record → payments seen automatically (from the tenant's "stop having to prove it" angle) → contract clarity + Ask Mabenn → CTA.
- **CTA** is the tenant offer: `Get on the tenant list →`, **free forever**, no card. The founding-member offer is landlord/imobiliária-only — omit it on the tenant page.
- **Voice** stays both-sided in substance but addresses the tenant as "you." The pricing comparison closer (8–12% manager fee) is a landlord wedge — drop or recast it.
- Use a separate copy namespace (`landingTenant`) — see §14 → Localization.

---

### 1. Hero

- **Goal:** State what Mabenn is and what it replaces, in one beat. Earn the next scroll.
- **Key message:** Property management without the property manager.
- **Suggested headline direction:** Mirrored phrase. Honest capability claim — Mabenn does the management work, you skip the manager. Defensible against fact-checking because it doesn't overclaim what a property manager does (tenant acquisition, viewings, etc.) — only what they administratively charge for.
- **Suggested visual / UI concept:** Headline + subhead + primary CTA (`Join the waitlist →`) + a peek of real product UI breaking the bottom edge of the hero card by 14px. Recommended peek: 3-row live billing strip with a `detected yesterday` micro-line under the first Paid row and a coral spotlight ring around the first Paid pill.
- **Notes for AI generation:**
  - Headline is 3 lines max, sentence case, Fraunces serif.
  - Subhead anchors geography (Brazilian landlords) and the wedge (8–12%).
  - **For pages targeting the DIY segment specifically**, the wedge shifts from 8–12% to time-and-anxiety. Alt subhead direction: "Rent tracking, contracts, and the lifecycle paperwork — for the Brazilian landlords already doing this themselves." The canonical landlord page leads with 8–12% because it's the cleanest contrast; DIY-targeted variants lead with the evenings, the WhatsApp threads, and the lawyer bills the DIY landlord pays instead.
  - No exclamation marks. Quiet conviction.
- **Canonical landing page (refreshed 2026-06 — task-led):** Eyebrow `For landlords who rent directly in Brazil`. Headline `Manage your rental without a property manager.` Subhead `Track rent, bills, contracts, renewals, maintenance, and important messages in one place — clear for you and your tenant.` Primary CTA `Join the waitlist`; quieter secondary `See how it works` (anchors to How it works). The old brand line `Property management without the property manager.` is retained as the OG/social hook, not the H1. (Pre-refresh the hero ran no eyebrow; the task-led version adds the audience eyebrow above the H1.)

---

### 2. Problem

- **Goal:** Name the trap the reader is in — two bad options — without slipping into doom marketing.
- **Key message:** You're paying 8–12% to a property manager who reports your income, or you're handling everything yourself in spreadsheets and WhatsApp. Both options cost more than they look like.
- **Suggested headline direction:** Stating the trap, not the rescue. "The choice you've had until now." or similar.
- **Suggested visual / UI concept:** Optional — two-column comparison-style framing, with the third option hinted but not yet named.
- **Notes for AI generation:**
  - Do not invent customer workflow specifics. We know they manage it themselves (often a spreadsheet); we don't know exactly how.
  - Mention the lawyer cost of DIY without melodrama.
  - Tax-reporting line is `automatic reporting to Receita Federal` — not "they spy on your taxes."
  - Name **both** halves of the trap. The PM-leaving landlord hears "8–12% + automatic reporting to Receita Federal." The DIY landlord hears "evenings, WhatsApp threads, missed adjustments, lawyer bills when something goes wrong." A page that only names one half loses the other audience.
- **Canonical landing page:** The problem isn't a dedicated section; it's compressed into the hero subhead and unpacked across the Pillar 2–4 bodies (landing page Sections 2–4) and the comparison closer. For longer marketing pages (about, ebook, blog) it earns its own section.

---

### 3. Solution

- **Goal:** Name the third option. Mabenn does the management work, without the manager or the fee.
- **Key message:** Mabenn is the third option. The work gets done. The percentage doesn't.
- **Suggested headline direction:** Declarative. "Mabenn is the third option." or "The work, without the manager."
- **Suggested visual / UI concept:** A single product surface that captures the spirit — usually the revenue dashboard (Pillar 1 anchor) or the live billing view (Pillar 2 anchor). Picks up the hero peek and expands it.
- **Notes for AI generation:**
  - Do not list every feature here. The solution beat is the *frame*, not the *catalog*.
  - One sentence each on the four pillars is plenty; the next section unpacks them.
- **Canonical landing page:** The pillar sections themselves collectively are the solution beat. There's no separate "the solution" section because the page is pillar-led.

---

### 4. How it works

- **Goal:** Explain the mechanism enough that the automation feels credible — without dropping the reader into Open Finance, DDA, or CNPJ matching.
- **Key message:** Connect the bank accounts. From that moment on, Mabenn handles the rest.
- **Suggested headline direction:** Three steps, plain language. "Connect → Confirm → Watch."
- **Suggested visual / UI concept:** Three-step illustration, each step a small mockup or chip showing the surface that step produces (a connected bank, a confirmed bill, a paid row in the ledger).
- **Notes for AI generation:**
  - Mechanism words (Open Finance, DDA, Celcoin, Pluggy, Belvo) live behind tooltips or `↗ how it works` links — never in the headline copy.
  - For the bill side: "every boleto issued to your CPF, plus utility bills sent to your property's Mabenn email."
  - Always say *both* banks (landlord + tenant) — the two-sided detection is the whole point.
- **Canonical landing page:** Implicit in the mechanism-triplet chips under each pillar (`SEES PAYMENTS MOVE` / `FINDS NEW BOLETOS` / `UTILITIES EMAIL THE BILL`). A dedicated "how it works" section is reasonable on a deeper feature page; the current landing page distributes it.

---

### 5. Key workflows / features

- **Goal:** Show what the product actually does, anchored on the messaging pillars.
- **Key message:** Three things — rent and bills seen automatically, the contract managed end to end, and trust that follows you to the next rental.
- **Suggested headline direction:** Pillar headlines as section headlines. "Stay on top of rent and bills." / "Never forget the adjustment again." / "Build trust. Take it with you."
- **Suggested visual / UI concept:** Each pillar gets a real product mockup as the hero of its section — not abstract icons, not stock illustrations. Editorial reference: "the product itself is the illustration."
- **Notes for AI generation:**
  - Pillar order matters. On the canonical landing page, the workflows section runs Pillar 2 → 3 → 4 (rent/bills → contract → both-sides/trust); Pillar 1 (revenue) lives in its own dedicated section after — see 11.6 below. The value compounds: tracking → lifecycle → portable identity → revenue payoff.
  - Mechanism-triplet chips under each pillar are the right place for the implementation detail.
  - Each mockup must use tabular figures, real BRL amounts, real Brazilian provider names where applicable (ENEL, Sabesp, Vivo), and one `detected today/yesterday` micro-signal.
- **Canonical landing page (refreshed 2026-06):** The pillars now map to the ordinal feature run — `01` Rent & bills, `02` Contracts, `03` Messages & maintenance, `04` Reporting (revenue folded in here), `05` Track record & screening — each a plain-headed feature section with a product mockup. See the §11 refresh callout for the full order.

---

### 6. Value proof — the revenue moment

- **Goal:** Land the landlord's headline value: how much they're making. This is the page's emotional center.
- **Key message:** Watch your rental income grow. Real numbers, sourced from real payments.
- **Suggested headline direction:** "Watch your rental income grow."
- **Suggested visual / UI concept:** A revenue dashboard mockup — large BRL total in Fraunces, coral-gradient line chart climbing left-to-right, YoY delta below, per-property footer. The cumulative line is the only loud accent moment on the page.
- **Notes for AI generation:**
  - This is the **single most important section for the landlord**. Give it real estate (`120px` above and below per the landing-page spec).
  - The chart should *animate in once* on scroll-in (left-to-right stroke draw, ~900ms ease-out).
  - View-dimension chips below the chart: this month / this year + lifetime / across properties.
- **Canonical landing page (refreshed 2026-06):** No longer a standalone "revenue moment" pivot. Revenue is now one beat inside the **Reporting** feature section (`04`), which also covers costs, net return after costs, estimated property value, and rent vs. comparable properties. The revenue dashboard remains the strongest element of the hero visual and the Reporting mockup, but the dedicated mid-page revenue section (with its `120px` rhythm and once-only chart draw) was folded into Reporting. This pattern entry stays valid for *other* surfaces (about page, a revenue-led feature page) where a dedicated revenue moment still earns its place.

---

### 7. The comparison — the wedge

- **Goal:** Make the wedge concrete. Property managers vs Mabenn, side by side, on the dimensions that matter.
- **Key message:** All the management. None of the manager. On a R$ 2.800 rent, the manager's cut is R$ 3.500 – R$ 4.000 every year, every year you own the property.
- **Suggested headline direction:** "All the management. None of the manager." — rhymes structurally with the hero ("Property management without the property manager") so the page reads as one composition.
- **Suggested visual / UI concept:** Two-column comparison table on desktop, card-per-row on mobile. Hairline dividers. No accent color in the table; the closing math figure (R$ 3.500 – R$ 4.000) is the only coral moment.
- **Notes for AI generation:**
  - Recommended row set: Monthly cost · Pricing model · Tracking · Communication · Tenant trust · Who's in the middle.
  - Pricing row: `8–12% of every rent check` (property managers) vs `Flat monthly. No percentage.` (Mabenn).
  - "Who's in the middle" row: `Property manager` vs `No one — you keep the relationship`.
  - The tax-reporting angle is *not* a row in the table. Demoted to a single factual line elsewhere or omitted entirely from this comparison.
  - Property-manager column is muted text; Mabenn column is high-contrast off-white. Mabenn wins by typography weight, not color.
  - The closing math line is Fraunces serif at ~36–40px — promoted to a memorable moment, not buried in body text.
- **Canonical landing page:** Section 6.

---

### 8. Use cases — two sides of the rental

- **Goal:** Show that both landlord and tenant get real value. Make the two-sided design tangible.
- **Key message:** Two sides of the same rental.
- **Suggested headline direction:** "Two sides of the same rental."
- **Suggested visual / UI concept:** Two columns side-by-side on desktop, stacked on mobile (landlord first). Coral check glyph at each bullet — the section's only color signal. Hairline vertical divider between columns.
- **Notes for AI generation:**
  - 5 bullets per side is the right density. Each bullet is a single line, declarative.
  - Mobile order is landlord first, tenant second.
  - Don't try to mirror bullets one-for-one; the lists are not parallel. The value to each side is genuinely different.
- **Canonical landing page:** Section 7.

---

### 8.3. Why we're building this (founder beat — optional)

- **Goal:** Pre-launch waitlist with no team signal feels speculative. A short founder/why-now beat is a high-trust signal at low copy cost. Only earns its place when the team has a credible story — don't fake it.
- **Key message:** We grew up watching family rent out apartments in Brazil and pay a manager for what was mostly paperwork. We're building the third option.
- **Suggested headline direction:** "Why we're building this." or "From the team." Not "About us."
- **Suggested visual / UI concept:** Single column, narrower than the main content. Optional small portrait + name + role + 3-sentence narrative. Human voice. No corporate "About" framing.
- **Notes for AI generation:**
  - Three sentences max. First sentence is a concrete observation, not a thesis. Second sentence names the wedge. Third sentence states what we're committed to.
  - Sign with both founders' real names — **Brandon** (American) and **Lucas** (Brazilian). Don't write in a single "I" voice and don't collapse to "the founding team." The copy is sourced from an AI interview with both, not fabricated (see §13 → Founder beat copy).
  - No "we're disrupting" language. No "we believe" generic mission statements. The narrative is the credential — Brazilian specifics, real cities, real cost of the problem.
  - This section is optional. A tight landing page can skip it if other trust signals are doing the work. It becomes more valuable as launch approaches (last-mile trust before conversion).
- **Canonical landing page (refreshed 2026-06 — now shipped):** Live as the **Founder** section, after Trust & security and before the FAQ. A real two-founder bio (Brandon + Lucas, with photo) — three short paragraphs (Brandon's perspective as tenant and self-managing landlord → Lucas's perspective as a lifelong tenant → why we built it), signed by both. Not the earlier placeholder.

---

### 8.5. Data and trust band

- **Goal:** A short, last-mile data-and-security beat before the CTA. Brazilian users care about LGPD and where their data lives — load-bearing trust signal for a product that asks both sides to connect their bank.
- **Key message:** Hosted in São Paulo. LGPD-compliant from day one. Read-only bank access.
- **Suggested headline direction:** No heading, or a tiny eyebrow like `BUILT FOR BRAZIL`. Visually a narrow ribbon, not a full section.
- **Suggested visual / UI concept:** A three-up row of small chips: data residency, LGPD, read-only bank. Restrained icon + one-line body per chip. Hairline borders only — this is a confidence ribbon, not a heavyweight section.
- **Notes for AI generation:**
  - Three chips, each one sentence: data residency ("Hosted in São Paulo · `sa-east-1`"), LGPD ("LGPD-compliant from day one — your data, your rights"), bank access ("Read-only bank access · Mabenn sees payments, never moves money").
  - Keep the words "LGPD" and "read-only" — they're the trust signals BR readers scan for. Don't soften into "compliant with data laws" or "secure bank access."
  - Do not link out to `/privacidade` here — that's footer real estate. The chip is the signal; the policy is the proof.
  - No emoji. No exclamation marks. No "world-class security" filler.
- **Canonical landing page (refreshed 2026-06 — now shipped):** Live as the **Trust & security** band, placed after the Two-sided section and before the Founder beat. Three chips: read-only bank access, hosted in Brazil, LGPD. A bordered confidence ribbon, distinct from its neighbors.

---

### 8.7. Common questions (optional)

- **Goal:** Handle the obvious objections before they're a reason not to convert. Especially important pre-launch when the visitor can't try the product to find answers themselves.
- **Key message:** Yes, this works. Yes, we thought about that.
- **Suggested headline direction:** "Common questions." or "Already wondering?"
- **Suggested visual / UI concept:** Two-column on desktop (Q/A pairs), single column on mobile. Each Q is one line, each A is one or two sentences max. Flat list if 5 or fewer questions; accordion only if it grows beyond that.
- **Notes for AI generation:**
  - Cover the 5–6 objections that map directly to known visitor friction: (1) how Mabenn detects payments, (2) what if my tenant won't connect their bank, (3) pricing, (4) LGPD/data, (5) what if you go out of business, (6) cancellation. Don't fabricate questions to sound thorough.
  - Each answer is 1–2 sentences. Honest, not defensive. No "great question!" preamble.
  - Don't link out to `/privacidade` or pricing here. The section is the trust signal; deep dives belong in their own surfaces.
  - This section earns its place when the visitor has unanswered objections that prevent waitlist conversion. On a tight landing page, the data/trust band (8.5) and the closer math do most of the work; FAQ is for longer pages or when waitlist conversion is the explicit goal.
- **Canonical landing page (refreshed 2026-06 — now shipped):** Live as the **FAQ** section before the final CTA — 12 questions in visitor-concern order, with `FAQPage` JSON-LD sourced from the same message keys (so the structured data can't drift). Grew past the 5-question flat-list threshold, so it renders as an accordion.

---

### 9. CTA

- **Goal:** Capture intent. Currently waitlist (the product is not yet open for self-serve).
- **Key message:** Take back the 8–12%. Become a founding member.
- **Suggested headline direction:** "Take back the 8–12%." Subhead names the founding-member offer concretely.
- **Suggested visual / UI concept:** Center-aligned. Headline + founding-member subhead + email form + optional social proof line + fine print + tenant secondary CTA. Asymmetric coral/rose glow at half intensity — bookends the hero glow.
- **Notes for AI generation:**
  - Form is a single email input + primary pill button (`Get on the list →`).
  - Subhead names the founding incentive in one line: "Founding members get a full year free, then R$ 39/month locked for life."
  - **Social proof line** above or below the form when the numbers earn it: "X landlords and Y tenants already on the waitlist." Do not show this until the numbers are credible — never fake it. The combined-side count (LL + tenant) is the most powerful version because it shows both sides are pulling.
  - Success state replaces the row inline: `✓ You're on the list. We'll reach out the moment Mabenn is ready for you.`
  - Fine print: "No spam. We'll only email you when Mabenn is ready for you."
  - **Tenant secondary CTA** earns a single line below the founding-member fine print, even on the landlord page: "Renting now — or about to? Start building your record. Free forever for tenants. `Get on the tenant list →`". Links to (eventually) a dedicated tenant waitlist surface. Solo tenant signup is real product capability, not a courtesy — and `free forever` is the trust signal that earns the click.
  - When the product opens to self-serve, the CTA shifts to `Get started →` and the form becomes a sign-up entry point. The founding-member offer stays as long as it's being honored.
- **Form implementation (already shipped — match it, don't reinvent):** single `email` field → the `joinWaitlist(email, locale)` server action (`src/app/actions/waitlist.ts`), which idempotently adds the contact to the Resend waitlist segment and sends a locale-aware welcome email. The client form (`src/app/(public)/waitlist-form.tsx`) fires `posthog.identify(email)` and `posthog.capture('waitlist_joined', { email, locale, resend_ok })`, then swaps to the inline success state. All copy reads from the `landing` namespace in `messages/{en,es,pt-BR}.json` via `useTranslations('landing')`.
- **Future — landlord/agent vs tenant split:** the tenant secondary CTA needs its own list so the two sides are distinguishable. When the tenant surface ships, add a `role` (`landlord` | `tenant`) to the captured event and route to a separate Resend segment — don't merge both sides into one undifferentiated waitlist.
- **Canonical landing page:** Section 8.

---

### Footer

- **Goal:** Wordmark, copyright, and the locale switcher (`EN` / `PT-BR` / `ES`, defaults to browser-detected). Plus links to `/privacidade` and `/termos`.
- **Notes for AI generation:** Tiny Fraunces version of the wordmark. Hairline top border. Faint. Utility, not feature.

---

## 12. UI & Visual Direction for Marketing Pages

Marketing surfaces follow the **editorial dark aesthetic** defined in `docs/project/design-editorial-reference.md` — palette, typography, cards, buttons, motion, illustration rules, and the full "what to avoid" list all live there. Read it first; this section only adds the marketing-page-specific rules on top.

The authenticated product shares the **same** warm-dark editorial language (`/DESIGN.md`). The split from marketing is *operating density* (the app) vs *storytelling presentation* (marketing's hero shells, glows, hand-drawn kit) — not a different palette.

**Required reading — hard dependencies.** Before generating marketing UI, read `docs/project/design-editorial-reference.md` (presentation layer: hero shells, glows, device peeks, hand-drawn kit), `/DESIGN.md` (token foundation), and the canonical landing-page spec at `docs/superpowers/specs/2026-05-22-landing-page-pivot-redesign-design.md`. If you cannot open them, do **not** invent palette or type values — use the minimum token block below and flag that the full spec was unavailable.

### Minimum token block

Marketing-page essentials, for when the source docs above aren't reachable. The canonical source is `/DESIGN.md` + `globals.css` — this is a fallback, not a substitute.

| Token | Value | Use |
|---|---|---|
| Shell (page) | `#141413` | Outermost warm near-black surface |
| Card | `#1a1a19` | Primary content card |
| Nested card | `#1f1e1d` | Mockup / illustration card inside a card |
| Primary text | `#f5f5f4` | Headings, card titles |
| Secondary text | `#a8a29e` | Body copy |
| Tertiary / meta | `#78716c` | Small-caps labels, timestamps |
| Accent (coral/rose) | `#e9408f` range | One signal moment per surface — never decorative |
| CTA button fill | `#f5f0e8` | Off-white pill; near-black `#1c1917` text |

- **Type:** Fraunces (serif) for display/headlines; Geist Sans for UI/body; Geist Mono for money and meta labels.
- **Never** pure `#000000` or `#ffffff` — both read sterile in this system.
- **One coral accent per surface** (spotlight ring, the cumulative line, or the rating star — never more than one).

### Marketing mockup requirements

Embedded product mockups in marketing pages must:

- Use **real Brazilian provider names** where applicable: ENEL, Sabesp, Vivo, Comgas.
- Render BRL amounts with **PT-BR formatting** (R$ 2.800,00, not $2,800.00). **Tabular figures** for every money rendering.
- Include at least one **`detected today/yesterday`** micro-signal somewhere visible.
- Use **PT-BR-flavored property names** (e.g., `Apt 23B, Vila Mariana`).
- Apply **at most one coral accent element per mockup** (a spotlight ring, the cumulative line, the rating star — never multiple).
- Use **status pill semantics from the in-app design system** (`Paid` green-shifted, `Due` amber, `Awaiting` neutral muted), not editorial accent. Mockups are embedded product UI — they inherit product semantics.

**Marketing mockups are a deliberate separate codebase from the real product.** Mark files explicitly: `// MARKETING ONLY — do not import into /app/*`. They are not a future component-library seed. Coupling marketing mockups to real components either cramps the product or makes the seed argument moot at launch.

### Section building blocks (shared naming)

A shared vocabulary so different agents name the same section the same way. These map to the canonical §11 narrative. **Interim:** names + roles only — the full prop-level inventory (props, variants, new-vs-shared flags) is pending a review of the implemented landing page, so treat the source files as the contract until then.

| Block | Role | §11 section |
|---|---|---|
| `HeroShell` | Full-bleed dark hero: glow, staggered headline/subhead/CTA, peek | 1 (Hero) |
| `PeekMockup` | Product-UI strip breaking the container edge by 14px | Hero + pillar sections |
| `PillarSection` | Pillar headline + body + mechanism triplet + mockup | 5 (Workflows) |
| `MechanismTriplet` | Three-chip row under a pillar (small-caps label + one line) | 4 / 5 |
| `RevenueMoment` | Revenue dashboard + animated cumulative line + view chips | 6 (Revenue) |
| `ComparisonTable` | Property-manager vs Mabenn two-column wedge | 7 (Comparison) |
| `TwoSidesUseCases` | Landlord/tenant two-column bullet lists | 8 (Two-sides) |
| `CtaSection` / `WaitlistForm` | Waitlist capture (already shipped — see §11.9) | 9 (CTA) |
| `TrustBand` | Data-and-security confidence ribbon (optional) | 8.5 |
| `FounderBeat` | Founder/why-now narrative (optional) | 8.3 |
| `Faq` | Common-questions Q/A list (optional) | 8.7 |
| `Footer` | Wordmark, locale switcher, `/privacidade` + `/termos` | Footer |

### Marketing-page layout

- **Mobile-first single column.** Outer container `max-width: ~640px`.
- **Section vertical rhythm:** `48–80px`. On surfaces that use a dedicated revenue moment, give it `120px` above and below. (The refreshed canonical landing page folds revenue into the Reporting feature section rather than a standalone pivot — see the §11 callout.)
- **Mockups break the container edge by exactly 14px to alternating sides.** "Screenshots peeking" treatment. Locked to 14px — no drift.

### Hero-specific

- Full-bleed dark surface with an asymmetric layered radial blur top-left, warmed to coral/rose.
- Headline at ~64px desktop / ~52px mobile, three lines max, sentence case.
- A 3-row product peek breaking the bottom edge by 14px — concrete product UI, real provider names, tabular figures.
- **Hero stagger sequence:** wordmark → headline lines (80ms each) → subhead (320ms) → CTA (420ms) → mockup peek (520ms).

### Revenue moment-specific

- The cumulative coral line **animates left-to-right via stroke-dash, ~900ms ease-out**. The only "theatrical" moment on the page.
- All other motion follows the editorial reference's restraint rules (200ms fade + small translate, one-shot reveals, no springs/bounce).

### Comparison table-specific

- Row stagger: 100ms per row on scroll-in.
- Property-manager column is muted text; Mabenn column is high-contrast off-white. Mabenn wins by typography weight, not color.

### Mechanism triplets

Three-column chip rows under each pillar. Three columns on desktop, stacked on mobile. Each chip: small caps tertiary label, one-sentence body in secondary text. (Examples in Section 13.)

### Accessibility & reduced motion

- Gate the revenue-chart stroke-draw (~900ms) and all stagger / reveal motion behind `prefers-reduced-motion: reduce` — render the final state immediately for users who opt out.
- Every embedded product mockup needs descriptive `alt` text (e.g., `"Live billing view: rent paid, detected yesterday"`). The mockup carries meaning; it's not decoration.
- Verify coral/rose (`#e9408f`) meets WCAG AA contrast for any **text** use; as a non-text accent (ring, line, star) it's exempt.
- Form inputs need an associated label (visible or `aria-label`) — the waitlist email field is not labelled by its placeholder alone.

### SEO & social metadata

Search and link-sharing decide whether a marketing page is ever seen. Rules:

- **Title:** `Mabenn | <positioning>`. Sentence-case `Mabenn` (meta is prose — see §1 Brand mark), ≤ ~60 chars, **pipe separator** (more compact in a browser tab than an em dash). Refreshed (2026-06) for search intent — Home (EN, `mabenn.com`): `Mabenn | Rental management for Brazilian landlords`; Home (PT-BR, `mabenn.com.br`): `Mabenn | Administração de aluguel sem imobiliária`. Subpages: `<Page> | Mabenn`. The titles target the phrases people search (`rental management` / `administração de aluguel sem imobiliária`), not the brand line — "property management" is the foil, not us. Source of truth: `MARKETING_META` in `src/lib/marketing-meta.ts`.
- **Description:** ≤ ~155 chars, on-positioning. **The §10 avoid-list applies to meta exactly as to body copy** — e.g. never "Everything a property manager does" (overclaim) in a title, description, or OG card. Home (EN): "Manage your rental without a property manager — rent tracking, contracts, and the lifecycle paperwork for Brazilian landlords, without the 8–12% fee." Home (PT-BR): "Administre seu aluguel sem imobiliária — recebimento de aluguel, contratos e toda a papelada da locação, sem a taxa de 8–12%."
- **OG / Twitter:** og + twitter title = the brand hook, "Rental management without the property manager." / "Administração de aluguel sem imobiliária." (sourced from `MARKETING_META.ogTitle`, which also feeds the Organization `slogan`). `summary_large_image`. `og:site_name` = `Mabenn`. Image 1200×630, follows the mockup/visual rules above (Fraunces headline + one product peek, warm dark, one coral accent, no emoji, no stock).
- **Localize by domain, not cookie.** Social crawlers send no `NEXT_LOCALE` cookie, so the only locale signal they carry is the host: `mabenn.com → en`, `mabenn.com.br → pt-BR`. Resolve locale from the host in a `generateMetadata` and localize title, description, and OG image per host. A static `export const metadata` serves one locale (en) to *every* crawler — don't use it for a multi-locale site.
- **OG images:** generated per locale at request time via `next/og` `ImageResponse`, selected by host (`src/app/(public)/opengraph-image.tsx` + `twitter-image.tsx`) — a warm-dark Fraunces typographic card with the localized hero line and one coral accent. A hand-designed product-peek static PNG can replace it later if the card warrants it. ES has no public URL yet → no ES OG until it's routed.
- **hreflang / canonical:** advertise an alternate only for each *routable* locale — `en → https://mabenn.com`, `pt-BR → https://mabenn.com.br`, plus `x-default → https://mabenn.com`. Do **not** advertise an `es` alternate until ES has its own URL (today it would collide with the en page).
- **Structured data (JSON-LD):** on the home page, an `@graph` of `Organization` (name `Mabenn`, url, logo, both founders) + `SoftwareApplication` + `FAQPage` (`src/app/(public)/page.tsx`). The `SoftwareApplication` now carries an `offers` node — **R$ 49/mo per rental, BRL**, via a `UnitPriceSpecification` (monthly, per rental). Assert the real list price, not `"0"` (which reads as free); the founding-member discount is intentionally **not** encoded — the structured offer is the standard one. `FAQPage` `mainEntity` is sourced from the same `messages/*.json` keys the visible FAQ renders (Q1–12), so the two can't drift.
- **Already provided by the app shell (don't duplicate):** `metadataBase`, `robots.ts` (disallows `/app`, `/auth`, etc.), `sitemap.ts`, icons, manifest. Add new marketing routes to `sitemap.ts` as they ship.

---

## 13. Copy Examples

### Strong headlines

- Manage your rental without a property manager. *(canonical hero H1 — task-led, 2026-06)*
- Property management without the property manager. *(brand line — OG/social hook + comparison-closer rhyme, not the H1)*
- Watch your rental income grow.
- Stay on top of rent and bills.
- Never forget the adjustment again.
- Two sides of the same rental.
- All the management. None of the manager.
- Trust isn't vanity. It's cash flow.
- Build trust. Take it with you.
- Take back the 8–12%.
- Ask Mabenn.
- Renewals stop being a deadline.
- Every conversation about the rental. One record.

### Strong subheadlines

- Rent tracking, contracts, and the lifecycle paperwork — for Brazilian landlords who'd rather keep the 8–12%.
- For Brazilian landlords already doing this themselves — without the spreadsheets, the WhatsApp threads, or the lawyer bills.
- Already self-managing? Mabenn does the parts that take your evenings — without taking a cut.
- Connect your bank. Invite your tenant to do the same. Mabenn handles the rest.
- The AI assistant reads Brazilian rental law and your specific contract — for the everyday questions. Both sides can ask.
- A verified, bank-event-derived payment record you can show your next landlord — Mabenn or not.
- On a R$ 2.800 rent, the manager's cut is R$ 3.500 – R$ 4.000 every year. Out of your pocket. Every year you own the property.
- Real numbers, sourced from real payments — not your memory, not your spreadsheet.
- Higher rating, less vacancy. More months earning.
- Stop being the one who has to remember and prove.

### CTA copy

| Context | Copy |
|---|---|
| Waitlist primary | `Join the waitlist →` |
| Waitlist form button | `Get on the list →` |
| Founding-member subhead | `Founding members get a full year free, then R$ 39/month locked for life.` |
| Social proof line | `X landlords and Y tenants already on the waitlist.` *(only when numbers earn it)* |
| Tenant secondary CTA | `Renting now — or about to? Start building your record. Free forever for tenants. Get on the tenant list →` |
| Secondary ghost (anchor) | `See how ↗` |
| Secondary ghost (external) | `Learn more ↗` |
| Future self-serve (when live) | `Get started →` |
| Founding-member badge label | `Founding member` *(optional suffix: `· since 2026`)* |
| Success state | `✓ You're on the list. We'll reach out the moment Mabenn is ready for you.` |
| Fine print | `No spam. We'll only email you when Mabenn is ready for you.` |

### Feature card / pillar titles

- Watch your rental income grow *(Pillar 1 — headline value)*
- Rent and bills, seen automatically *(Pillar 2)*
- The contract, end to end *(Pillar 3)*
- Built for both sides *(Pillar 4 — absorbs trust + conversations)*
- All the management. None of the manager. *(comparison closer)*

Supporting beat titles inside Pillar 4:
- Every conversation about the rental. One record.
- Reputation that follows you.

### Short product explanations

- Mabenn watches both banks. Rent landing, bills clearing, condo paying — all detected, none entered.
- Draft the contract in Mabenn. From day one, every milestone is tracked. Adjustments, renewals, expirations — they show up before they're a problem.
- Tenants build a payment history that follows them. Landlords build a record of responsiveness and fair adjustments. Earned from events, not reviews.
- Late rent? Mabenn drafts the formal notice the Lei do Inquilinato requires. If it escalates to eviction, Mabenn drafts the paperwork your lawyer would otherwise prepare. The lawyer files.
- Both sides see the same live billing view, the same ledger, the same contract. No more "did you pay the condo this month?"

### Pillar supporting copy

For when an AI needs the full pillar copy on one surface. Pillar architecture lives in Section 6; this is the canonical copy bank.

**Pillar 1 — Watch your rental income grow**

> Every paid rent, every cleared bill, every adjustment — Mabenn rolls them up into the only view that really matters: how much you're making. See this month's income. See the year. See the lifetime of every contract. Across all your properties, or zoomed into one.
>
> The numbers are real, sourced from real payments — not your memory, not your spreadsheet.

**Pillar 2 — Stay on top of rent and bills**

> Connect your bank. Invite your tenant to do the same. From there, Mabenn sees every payment as it happens — rent landing in your account, bills clearing, condo paying. Bills get found the same way. Every new boleto shows up the day it's issued — condo, insurance, anything billed by boleto to the property's CPF. Utility providers (which bill by convênio, not boleto) send their bills to your property's Mabenn email address, and we read each one the moment it arrives.
>
> You don't enter anything. Your tenant doesn't either. Mabenn does it all.

**Pillar 3 — Never forget the adjustment again**

> Every key moment is tracked from the day the contract starts in Mabenn — annual adjustments, renewals, expirations, every charge due date. When your IPCA adjustment is coming, Mabenn proposes the new rent. You and your tenant review and agree in the platform. When rent comes in late, Mabenn drafts every notice the Lei do Inquilinato requires — and prepares the paperwork your lawyer would otherwise draft if it escalates to eviction.
>
> Have an everyday question? Ask Mabenn. The AI assistant reads the Lei do Inquilinato — tenant rights, eviction process, every regulation — and your specific contract. Both landlord and tenant can ask. Both sides see the same answer. For complex disputes, a lawyer is still the right call.

**Pillar 4 — Two sides of the same rental** *(landlord column)*

> See what you're making — every month, every year, every contract. Stop chasing rent. Stop asking if bills got paid. Never miss an adjustment, renewal, or late notice. Handle late payments without four-figure lawyer fees. Every conversation about the rental kept on record. Build a verified record of responsiveness and fair adjustments — and let it bring you better tenants on the next rental.

**Pillar 4 — Two sides of the same rental** *(tenant column)*

> Stop being the one who has to remember and prove. See what you owe. Watch every payment clear automatically. Know rent adjustments before they happen — and why. File a maintenance request and watch the clock start. Read your contract in plain Portuguese, not legalese. Talk to your landlord in Mabenn — every conversation timestamped, next to the rental it's about. Build a verified, bank-event-derived payment record you can show your next landlord — Mabenn or not. **Free forever** — sign up solo or by landlord invite, no card required.

**Closer — All the management. None of the manager.**

> Property managers charge 8–12% for what's mostly tracking, paperwork, and chasing payments. Mabenn does that — automatically, for both sides — for a flat monthly price that doesn't scale with your rent. You handle the property. Mabenn handles the know-how.
>
> On a R$ 2.800 rent, the manager's cut is R$ 3.500 – R$ 4.000 every year. Out of your pocket. Every year you own the property.

### Mechanism-triplet chip examples (label + one-sentence body)

```
SEES PAYMENTS MOVE          FINDS NEW BOLETOS           UTILITIES EMAIL THE BILL
On both sides — rent        Mabenn knows the day        Your provider sends bills
landing, bills paid,        a boleto is issued.         to your property's Mabenn
condo cleared.              Condo, insurance, more.     address. We read each one.
```

```
EVERY KEY DATE              ADJUSTMENTS + NOTICES       ASK MABENN
Annual adjustments,         When rent adjustment is     AI that reads Brazilian
renewals, expirations —     due, Mabenn proposes the    rental law and your
tracked, nudged.            new amount. Late? It        contract. Both sides
                            drafts the notice.          can ask.
```

```
EARNED FROM EVENTS          PORTABLE                    BOTH SIDES
Every on-time payment       Move to a new tenant or     Tenants build a payment
counts. No fake reviews.    landlord — your record      record. Landlords build
No drive-by ratings.        comes with you.             a responsiveness record.
```

### Data and trust band copy

```
HOSTED IN SÃO PAULO         LGPD FROM DAY ONE           READ-ONLY BANK
Brazilian data residency.   Your data, your rights.     Mabenn sees payments,
sa-east-1.                  Documented retention,       never moves money.
                            audit trails, the works.
```

### Common questions copy

**Q: How does Mabenn detect payments?**
A: Open Finance — read-only. With your permission, Mabenn sees payments clear in your bank: rent landing in your account, bills going out. Mabenn never moves money.

**Q: What if my tenant won't connect their bank?**
A: Mabenn still works. Rent and bill detection runs on whichever side connects. Tenant-side confirmation is the upgrade once they're on — and tenants can sign up solo to start their own record.

**Q: What does it cost?**
A: R$ 49/month per rental, or R$ 490/year (two months free). First rental free. Tenants free forever. Founding members (waitlist signups) get a full year free and a locked R$ 39/month rate after.

**Q: Is this LGPD-compliant?**
A: Yes. Hosted in São Paulo (`sa-east-1`), audit trails on sensitive mutations, documented retention periods. The `/privacidade` policy is in Portuguese.

**Q: What if you go out of business?**
A: Your contract data, payment history, and reputation record export at any time. Mabenn is the system of record, not the only place your data lives.

**Q: Can I cancel anytime?**
A: Yes. Monthly billing cancels at the next renewal; annual billing prorates the unused months back.

### Founder beat copy

> **Placeholder — do not ship prose here as written.** The earlier draft in this slot was fabricated for illustration and has been removed. Mabenn has two founders: **Brandon** (American) and **Lucas** (Brazilian). When this section is implemented, the real copy is produced by having the AI **interview Brandon and Lucas** and write the beat from their actual words — concrete observations, real cities, the real reason they're building this. Do not invent founder biography, cities, or a property-manager percentage.
>
> Structure to fill from the interview (per §11.8.3): three sentences max — (1) a concrete observation, (2) the wedge, (3) what they're committed to. Sign with both founders' real names. Two founders → don't write in a single "I" voice; don't collapse to "the team."
>
> _LinkedIn (starting point for the interview / fact-check):_ Brandon — https://www.linkedin.com/in/brandfleming; Lucas — https://www.linkedin.com/in/lucas-de-barros-castro-mota/.

### Bad / generic copy to avoid

| Don't write | Why it fails |
|---|---|
| "AI-powered rental management for the modern landlord" | Generic AI-marketing voice. Says nothing specific. |
| "The all-in-one platform to streamline your rental business" | Enterprise B2B SaaS voice. "Streamline" + "all-in-one" + "platform" = noise. |
| "Empowering Brazilian landlords to take control of their rentals 🚀" | Empower-language + emoji + abstract claim. Three failures in one sentence. |
| "Stop using spreadsheets to manage your tenants!" | Pre-pivot positioning. Exclamation mark. Says tenants are the problem (they aren't). |
| "Avoid the property manager and the tax man" | Legal-risk wording. Never. The phrase is "you stay in control of your tax obligations." |
| "Best-in-class platform for long-term rentals" | "Long-term" qualifier banned. "Best-in-class" is filler. "Platform" carries no meaning here. |
| "Mabenn helps you manage your rental life with intelligence and ease" | Vague verbs, abstract nouns, hollow adjectives. Show the receipts. |
| "Revolutionizing the way Brazil rents" | Disruption-language about ourselves. The disruption shows in the contrast, not in the claim. |
| "Click here to learn more" | Generic. Use `See how ↗` or `Learn more ↗`. |
| "Welcome to Mabenn — your new favorite app!" | Casual + exclamation + presumptuous. Quiet conviction is the voice. |

---

## 14. AI Generation Instructions

This block is reusable. Paste it into any prompt that asks an AI to generate Mabenn marketing copy, landing pages, blog posts, social, or page UI.

### How to use this document

You are generating marketing content for **Mabenn**, a Brazil-first rental platform that does what a property manager does — without the 8–12% fee and without reporting income to Receita Federal. Before generating anything:

1. Read this document end-to-end. It is the source of truth for positioning, voice, audience, and visual direction.
2. Identify which messaging pillar(s) (Section 6) the requested artifact should anchor on.
3. Pick the right surface vocabulary: **public marketing** uses the editorial dark aesthetic (Section 12). **Authenticated product UI** follows the app design system (`/DESIGN.md`) — the same warm-dark language at operating density. Keep marketing's storytelling devices (heroes, glows, hand-drawn kit) off operating screens.
4. When in doubt, prefer the canonical landing-page spec at `docs/superpowers/specs/2026-05-22-landing-page-pivot-redesign-design.md` for concrete examples.

### Section priority when generating a single artifact

If the request is for one specific output, prioritize sections in this order:
- **Headline copy:** Section 13 (Copy Examples) → Section 6 (Messaging Pillars) → Section 10 (Voice).
- **Page section copy:** Section 11 (Website Narrative) → Section 6 (Pillars) → Section 8 (Value Propositions) → Section 10 (Voice).
- **Page or component UI code:** Section 12 (UI & Visual Direction) → Section 11 (Narrative) → Section 13 (Copy Examples).
- **Long-form content (blog, about page):** Section 1 (Product Summary) → Section 3 (Core Problem) → Section 6 (Pillars) → Section 9 (Use Cases).
- **Social / announcement:** Section 13 (Copy Examples) → Section 4 (Product Promise) → Section 10 (Voice).
- **Marketing / lifecycle email** (waitlist welcome, launch, founding-member): Section 13 (Copy Examples) → Section 4 (Product Promise) → Section 10 (Voice) → §14 (Marketing emails).

### Staying consistent with positioning

Every artifact must answer at least one of these implicitly:
- What is Mabenn? (Sec. 1)
- For whom? (Sec. 2)
- What's the trap they're in? (Sec. 3)
- What does Mabenn replace? (Sec. 4)
- Why is Mabenn meaningfully different? (Sec. 7)

If an artifact answers none of these, it's not Mabenn content — it's filler.

### How to generate page structure

Use Section 11 as the default flow. Drop any section that doesn't earn its place on the specific page being generated. Use the canonical landing page (8 sections + footer) as the worked example.

### How to generate copy

- Default to declarative sentences. State what's true. No conditional hedging.
- Lead with **revenue** for landlord-facing content. "How much am I making?" is the headline value; tracking is the supporting evidence. *"Lead" here means emotional priority, not literal scroll position. On the refreshed canonical landing page (2026-06) revenue is folded into the Reporting feature section and carried by the hero visual rather than staged as a standalone mid-page moment — don't move the revenue dashboard into the hero, and don't assume every page has a dedicated revenue section.*
- Lead with **portable record** for tenant-facing content. Tenant value = the receipts they take with them.
- Lead with **two sides** for general / both-audience content.
- Use real Brazilian context — `R$`, IPCA, Lei do Inquilinato, ENEL/Sabesp/Vivo, fiadores, caução, condomínio, boletos. PT-BR institutional terms stay PT-BR across all locales.
- Never use the words / phrases in Section 10's "avoid" list.
- Sentence case headlines. No exclamation marks. No emoji. Tabular figures for money.
- **Plain section headers and list-item titles.** Section headers and feature/list-item titles are plain noun labels (e.g. "Contracts", "Messages & maintenance", "Reporting", "Track record & screening"; item titles like "Reputation", "Tenant screening") — not editorial sentences ("Trust that's earned — and easy to check"). A small amount of editorial language belongs in *body* copy, not in headers or item titles. This is a load-bearing guardrail from the 2026-06 landing refresh — see §11.

### Localization

- Marketing copy lives under the `landing` namespace in `messages/{en,es,pt-BR}.json`, read via `useTranslations('landing')`. A future tenant page should use its own namespace (e.g., `landingTenant`) rather than overloading `landing`.
- **Generate all three locales.** Draft EN against the §13 copy bank, then generate PT-BR and ES. Mark the PT-BR and ES output for **native-speaker review** before launch — AI translation is the first pass, not the final word.
- Brazilian institutional terms (IPCA, Lei do Inquilinato, condomínio, boleto, fiador, caução, Pix) stay in **PT-BR across every locale** — they're proper nouns. EN/ES may add a short parenthetical gloss; never invent an equivalent.
- Never hardcode a user-facing string in a component — add the key to all three message files.

### How to generate UI

- Marketing surfaces: warm dark editorial (Section 12). Fraunces serif for display, Geist Sans for UI, warm near-black palette, coral/rose accent reserved for moments of signal.
- Mockups embedded in marketing pages render real product UI (real provider names, real BRL amounts, status pills following the in-app system). Mark mockup files explicitly as marketing-only.
- One primary CTA per section. Mobile-first single column. Vertical rhythm of 48–80px (120px around the revenue moment).
- Mockups break the container edge by 14px to alternating sides.
- Restrained motion (200ms fade + small upward translate, one-shot reveals, no springs/bounce).

### What to avoid

- Implementation detail as feature ("powered by Open Finance," "DDA-integrated", "deterministic extraction via curated provider profiles"). Mechanism stays in tooltips, FAQs, and engineering docs — never in headlines.
- Defensive AI-positioning ("not AI-guessed, accurate extraction"). Don't plant doubts the customer doesn't already have.
- Tax-avoidance language. "You stay in control of your tax obligations" is the only acceptable framing.
- The "long-term" qualifier. Just "rentals."
- Pre-pivot positioning ("shared billing workspace," "stop using spreadsheets," "publish monthly statements"). The product moved.
- "Coming soon," "beta," "in development," or any scope-gap disclosure. Marketing pages sell the mature vision as if it ships. Internal scope notes live in CLAUDE.md and planning docs, never in customer-facing copy.

### Marketing emails

Scope: **marketing / lifecycle emails only** — waitlist welcome, launch announcement, founding-member nurture, future newsletters. Transactional / product emails (rent detected, adjustment proposed, late-notice ready, invites) are **out of scope here** — they're governed by the `analytics` (notifications) and domain skills. §10 voice still applies to them, but positioning doesn't drive their content.

These emails are a marketing surface and inherit everything: positioning (§1, §4), voice + the avoid-list (§10), brand casing (lowercase `mabenn` wordmark only in the email header/logo; sentence-case `Mabenn` in subject and body), and §14 localization (EN draft → PT-BR/ES → native review; institutional terms stay PT-BR). Locale-aware sends already exist via `src/emails/i18n.ts`.

This doc owns *what the email says and how it sounds*. The `email-templates` skill owns *how it's built* (React Email, Resend, Edge Functions) — don't duplicate engineering detail here.

Per email:
- **Subject:** declarative, specific, sentence case. No exclamation marks, no emoji. The §13 headline bank sets the tone.
- **Preview text:** one line that earns the open — don't repeat the subject.
- **Body:** quiet conviction, short, one primary CTA. The CTA mirrors the surface (pre-launch: waitlist / founding-member confirmation; post-launch: `Get started →`).
- **Worked example:** the waitlist welcome (`src/emails/waitlist-welcome.tsx`) is the canonical marketing email — it confirms the signup, sets the founding-member expectation, and stays on-positioning.

### When to ask for clarification

Pause and ask the user when:
- The artifact is for a surface not covered here (a physical brochure, a video script, a podcast read) — confirm voice and constraints first.
- The artifact targets an audience that's not the small Brazilian landlord or their tenant (e.g., real estate agents, investors, press) — confirm the positioning shift.
- The request implies a product capability you can't verify in this doc or the source docs — confirm it exists before claiming it.
- The request includes a specific number (price, conversion rate, market size, feature count) — confirm; do not invent.
- The request would require Mabenn to take a stance on tax-avoidance or anything legally adjacent — confirm wording.

---

## 15. Assumptions

The following were inferred from the source docs because they weren't stated explicitly. Each is marked so future humans can validate or correct.

| # | Assumption | Why I assumed it | Risk if wrong |
|---|---|---|---|
| 1 | The mature product vision (full AI assistant, two-sided reputation marketplace, in-platform negotiation, maintenance request workflows, eviction-paperwork drafting) is what's being marketed — even though several of these are CLAUDE.md phase-2+ items. | The landing-page spec explicitly states "The page sells the **mature product vision**, not the day-one scope" — and the user confirmed in this session: "we're thinking about what the product will be." Marketing surfaces stay silent on scope gaps. | Foundation doc could feel disconnected from the launch product if read alongside internal roadmap docs — but for marketing-generation use, this is the intended frame. |
| 2 | Brand name styling is lowercase wordmark `mabenn`, but the product is referred to as `Mabenn` in prose. | The landing-page spec uses lowercase `mabenn` for the wordmark in the footer and references; the editorial reference uses sentence case for all body copy. | **Resolved (in-session 2026-05-26)** — locked in §1 (Brand mark): lowercase `mabenn` wordmark only; sentence-case `Mabenn` in prose, headlines, and meta; never all-caps. |
| 3 | The audience is small Brazilian landlords who self-manage, without a hard property-count cap, plus small imobiliárias / independent agents as a secondary audience. | Confirmed in-session: removing the 1–5 cap widens the audience to anyone self-managing, and imobiliárias managing on behalf of clients are explicitly in scope as a secondary audience. | Low — confirmed. |
| 4 | Pricing is **flat monthly per rental, never a percentage.** Base plan: R$ 49/month per rental (or R$ 490/year, two months free), first rental free, tenants free forever. Founding members (waitlist signups) get their first year free on every rental, then R$ 39/month locked for life, plus a visible `Founding member` badge on their profile. Single tier — no Pro plan for now; imobiliária-specific pricing not separated. | Confirmed in-session 2026-05-24; **revised 2026-05-27: simplified to flat per-rental (active or not) — dropped the "active rental" qualifier.** | Low — committed; only the R$ 49 number could move (within R$ 39–59 range) if market response demands. The "never a %" and "founding member badge" commitments are positioning anchors. |
| 5 | Reputation rating uses a 1.0–5.0 float on an Airbnb-style `★ X.XX` display, with new users anchored at 4.0. | Detailed in the landing-page spec's reputation rating computation block, marked "concept-level — for the implementer to lock when the real product surfaces ship." | Low — this is the canonical concept-level decision. |
| 6 | Response time is a reputation metric for **both** sides (originally spec'd only on the landlord card). The user greenlit extending this in-session. | User explicitly said "the response times for LL and tenant are used in the ratings as well." | Low — confirmed in conversation. |
| 7 | DDA finds any boleto issued to the registered CPF, not just condo fees. | User explicitly corrected this in-session; product-pivot doc supports it (DDA is the boleto-discovery channel; condo is the most common example). | Low — confirmed in conversation. |
| 8 | The product is referred to in marketing as a "rental management platform" or "rental platform," not "long-term rental management platform." | User explicitly stated "no need to call out long-term rentals." | Low. |
| 9 | Open Finance provider (Pluggy vs Belvo) is not named in marketing copy — both are abstracted as "your bank." | The product-pivot doc explicitly lists the decision as pending Phase 0 spike. Naming a partner is in the landing-page spec's follow-up list. | Low — already hidden by design. |
| 10 | The current canonical landing page is landlord-focused; a tenant-facing page comes later. | User explicitly stated "this page is focused on landlords. We can do a tenant facing one another time." | Low — confirmed in conversation. |

---

## 16. Open Questions / Conflicts

### Conflicts between source docs

| # | Conflict | Where it lives | Suggested resolution |
|---|---|---|---|
| 1 | `docs/sales/alex-pitch.md` describes the pre-pivot product (short-term rentals, "shared billing workspace," publish monthly statements). | Stale doc in `docs/sales/`. | Either rewrite for the new positioning or move to an archive. Currently excluded from this foundation doc per user instruction. |
| 2 | `docs/project/README.md` previously described the pre-pivot workflow ("publish monthly statements," "bill-backed transparency wedge"). | README is being refactored in the same cycle as this foundation doc. | Resolved by refactor (in progress). |
| 3 | The product-pivot doc lists **Communication Hub** as Pillar 3. CLAUDE.md marks messaging-beyond-notifications and maintenance request workflows as **phase 2+**. The landing-page spec puts maintenance specifics in out-of-scope. | Tension between mature-vision marketing and day-one scope. | **Resolved (in-session):** marketing surfaces are sales pages and stay silent on scope gaps. Sell the mature vision as if it ships. Internal docs preserve the distinction. |
| 4 | `/DESIGN.md` and `design-editorial-reference.md` once described different palettes (in-app teal vs editorial coral/rose). | Was a two-world split. | **Resolved:** the app adopted the warm-dark editorial language — teal stays the interactive **primary**, magenta `#e9408f` is now the app's secondary accent (`--highlight`). One shared palette; the split is operating vs storytelling, not color. |

### Open questions for human input

1. ~~**Exact pricing numbers.**~~ **Resolved (in-session 2026-05-24; revised 2026-05-27 to per rental, active or not):** R$ 49/month per rental, R$ 490/year (two months free), first rental free, tenants free forever. Founding members get first year free, then R$ 39/month locked for life, plus a visible `Founding member` badge. Single tier. No separate imobiliária pricing. See Section 7 (Features) and Assumption #4 for full structure.
2. **Open Finance partner naming.** Once Pluggy/Belvo is decided, do we name the partner in marketing copy (trust signal) or keep it abstracted ("your bank")?
3. **Provider coverage at launch.** If the launch supports limited utility providers, does the landing page disclose coverage somewhere (a "supported providers" subtle reference, a regional rollout disclaimer)? Currently the page says "your provider" generically.
4. ~~**Brand mark casing.**~~ **Resolved (in-session 2026-05-26):** lowercase `mabenn` wordmark in logo + footer only; sentence-case `Mabenn` in prose, headlines, and meta; never all-caps `MABENN`. See §1 (Brand mark).
5. **Launch geography.** Is launch Brazil-wide from day one, or region-controlled (e.g., São Paulo + Florianópolis first)? Affects whether the page can claim "Brazil-wide" or needs softer language. Also affects reputation marketplace density timeline — see #10.
6. **Tenant-facing marketing page.** ~~Currently the canonical landing page is landlord-led with tenant value carried in the two-sided sections.~~ **Resolved (in-session 2026-05-24):** the current landing page stays landlord-focused. A dedicated tenant-facing page is deferred to a later cycle — but with the addition of **solo tenant signup** (tenants can sign up and start building a payment record without their landlord on the platform), this page should be prioritized sooner rather than later. Solo tenants are a real growth lever: every tenant signup is a potential landlord invite. Until the dedicated page ships, the landlord page carries a tenant secondary CTA (see Section 11.9).
7. **Press / investor positioning.** Does this foundation doc apply to press releases and investor decks, or do those need a different voice (more disruptive, more thesis-led)?
8. ~~**Eviction-paperwork scope.**~~ **Resolved (in-session 2026-05-24):** softened wording locked in across the doc — "Mabenn drafts the paperwork your lawyer would otherwise prepare; the lawyer files." Routine late-rent notices remain templated and drafted by Mabenn. Voice rule added in Section 10. Recommend a legal review before launch to confirm the softened scope is also legally defensible.
9. **Tax messaging legal review.** Tax-reporting framing has been demoted from a pillar; if it appears at all in copy, "you stay in control of your tax obligations" is the carefully chosen phrase. Recommend a legal review before launch.
10. **Reputation marketplace density runway.** The two-sided portable reputation is positioned as a moat from day one. The marketplace effect (tenant moves between two Mabenn landlords) requires meaningful density per city. Until then, the tenant-side promise should lean on "verified third-party record you can show *any* landlord" rather than "your record follows you to your next Mabenn landlord." Decide when to flip the framing.
11. **Imobiliária-specific marketing surface.** Imobiliárias are now a secondary audience. They're served by the same product and same copy, but at some point a dedicated landing page or section may earn its place. Decide when.
12. **Multi-party scope alignment with CLAUDE.md.** This doc now positions multi-landlord (co-owners) and multi-tenant (shared rentals) as supported — per the mature-vision frame. CLAUDE.md currently lists "co-landlord collaboration" under "Do not overbuild" for MVP. Reconcile: either (a) co-landlord ships earlier than CLAUDE.md anticipated, (b) marketing claims the mature vision while MVP serves single-landlord/single-tenant first, or (c) update CLAUDE.md. Multi-tenant on a shared rental is genuinely common in BR (repúblicas, couples) and likely needs to be in MVP regardless.
