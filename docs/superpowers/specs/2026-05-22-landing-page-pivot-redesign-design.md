# Landing Page — Pivot Redesign

**Date:** 2026-05-22
**Scope:** Rewrite the public marketing landing page (`src/app/(public)/page.tsx` + `landing.tsx`) to match the long-term-rental management positioning established in `docs/project/product-pivot-long-term-rentals.md`.

This spec defines **what** the new page communicates, **how** it's structured, and the **aesthetic intent** every implementer should preserve. It is not an implementation plan — the planner decides file layout, motion implementation, translation key naming, and mockup component file paths.

The page sells the **mature product vision**, not the day-one scope. Features described here (AI assistant, full reputation marketplace, eviction paperwork, etc.) represent what Mabenn is — not a phased rollout schedule.

---

## Why this redesign

The current landing page (`/`) was written for the prior short-term-rental positioning. It claims a "shared billing workspace" and walks through a four-step process ending in "publish monthly statements" — a feature that no longer exists in the product. The new product is:

- Positioned as the **alternative to paying 8–12% for property management** (long-term rentals).
- Built around **three pillars**: automated rent/bill tracking, contract management, and a two-sided trust marketplace.
- **Passive by design** — Open Finance + DDA + bill ingestion run in the background.
- **Brazil-first** — IPCA, Lei do Inquilinato, fiadores, caução are first-class context.
- **Trust-led** — both landlord and tenant build portable, event-driven reputations.

The redesign brings the page in line with the product. It also moves the aesthetic to the project's existing editorial reference (`docs/project/design-editorial-reference.md`) — warm dark, serif display, hairline borders — which the current page does not follow.

---

## Decisions locked during brainstorming

| Decision | Choice | Why |
|---|---|---|
| **Aesthetic direction** | Editorial dark (warm `#141413`, serif display, hairline borders) | Matches the project's editorial reference for marketing surfaces. Disrupts the prior generic-SaaS light treatment. |
| **Asymmetric glow** | Keep | Existing brand signature. Glow warmed to coral/rose on dark surface (matches editorial accent). |
| **Tone** | Disruptive but honest. Punchy headlines, plain body copy, no jargon. | User direction. |
| **Hero headline angle** | Capability-parity wedge ("Everything a property manager does. None of the fee.") | Picks up the existing wedge without naming an enemy as bluntly as "Skip the property manager." |
| **Page structure** | Pillar-led (Hero → 3 pillars → revenue moment → comparison → two-sides bullets → CTA) | Mirrors how the product is built; mockups embedded inside pillars carry more weight than a gallery. |
| **Tax messaging** | Softer wording in the comparison row ("Automatic" vs "You stay in control"). Not a standalone section. Receita Federal not named. | Lands the wedge without legal exposure. |
| **CTA destination** | Waitlist (existing flow) | Product not yet open for self-serve. |
| **Localization** | EN, PT-BR, ES day one (all keys written when the page ships) | Honors the project's localization invariant. |
| **Display font** | **Fraunces** (variable, optical 144) | Editorial serif with character. Free, performant, distinctive. Not Times, not Playfair, not GT Super. |
| **Body font** | **Geist Sans** | Geometric sans with restraint. Free, performant, distinct enough from default Inter. |
| **Long-term qualifier** | Drop from hero | "Aluguel" implies long-term in PT-BR; product features (IPCA, Lei do Inquilinato) self-filter. |
| **Property naming** | Generic categories in body copy ("electricity, water, internet, gas"); real provider names (ENEL, Sabesp, Vivo) only inside mockups | Regional-neutral copy; mockups can be concrete because they show one sample property. |
| **Footer locale switcher** | In footer, default to browser-detected locale | Low-chrome surfacing of the three locales. |
| **Eviction scope claim** | Page says Mabenn **drafts the paperwork** required if eviction proceedings begin. Mabenn never executes the eviction itself. | Honest scope. We provide documents; the LL files them. |
| **Reputation rating** | Public 1.0–5.0 float in Airbnb style (`★ 4.87`), shown prominently next to the name. | Familiar pattern; fastest to grok. |

---

## Aesthetic and motion baseline

Applies across every section unless overridden.

**Surface palette (per editorial reference):**

| Role | Tone | Usage |
|---|---|---|
| Page shell | `#141413` (warm near-black) | Outer background |
| Surface 1 (card) | `#1a1a19` | Pillar mockup cards |
| Surface 2 (nested) | `#1f1e1d` | Mechanism chips inside pillars |
| Hairline border | `rgba(255,255,255,0.06)` | Card edges |
| Primary text | `#f5f5f4` (warm off-white) | Headlines, labels |
| Secondary text | `#a8a29e` | Body, descriptions |
| Tertiary text | `#78716c` | Section labels, meta |

**Accent color:**

- **Editorial accent: coral/rose `#e9408f`-ish** (per editorial reference's defined accent range). Used **only** for the page's deliberate moments of signal:
  - The cumulative line in the revenue chart (the page's single theatrical moment).
  - The `R$ 3.500 – R$ 4.000` figure in the comparison closer.
  - Spotlight rings around individual storytelling-kit elements (e.g., the `Today` marker on Pillar 2's timeline, the `Paid` chip in the hero peek).
  - The fill on reputation card progress bars / score visualizations.
- Status pill colors **inside product mockups** (Paid = green-shifted, Due = amber, Awaiting = neutral muted) follow the **core in-app design system**, not editorial. Mockups are embedded product UI, so they inherit product semantics. Document this explicitly so an implementer doesn't try to recolor pills to coral.
- **The in-app teal primary stays in-app.** Editorial coral/rose lives only on storytelling surfaces. They are two different worlds by design — do not harmonize.

**Typography:**

- **Display family — Fraunces:** Variable weight, optical 144. Sentence case. Tracking −0.01 to −0.02em at display sizes. Line-height 1.02–1.10 at headline sizes. Weight 500/600 — never hairline.
- **UI family — Geist Sans:** Weights 400 (body), 500 (UI labels, buttons), 600 (card/step titles), 700 only for emphasis. Tracking 0 at body, -0.01em at titles. Tabular figures (`tnum`) required wherever money or aligned columns appear.

**Radius tokens (explicit per editorial reference):**

- Hero / modal-like outer container: `rounded-[28px]`
- Content cards (mockups, comparison blocks): `rounded-[20–24px]`
- Nested cards (mechanism chips, status indicators): `rounded-[16–20px]`
- Decreasing radius as nesting deepens — visually reinforces hierarchy.

**Layout:**

- Mobile-first single column, `max-width: ~640px` outer container.
- Sections separated by `48–80px` of vertical rhythm; revenue moment gets **120px above and below** as the page's emotional pivot.
- Mockup cards break the container edge by exactly **14px** to alternating sides — "screenshots peeking" treatment per the editorial reference. Locked to 14px to avoid drift into accidental-misalignment territory.

**Motion:**

- Per editorial reference: brief fade + small upward translate, ~200ms ease-out. No springs, no scale, no bounce.
- Each section reveals on scroll-in with a small stagger inside it (60–100ms per child). One-shot, no replay.
- Hero animation: staggered fade-up — wordmark (0ms) → headline lines (80ms each) → subhead (320ms) → CTA (420ms) → mockup peek (520ms).
- Comparison table: row stagger at **100ms per row**.

**Headline sizing:**

- Hero: **64px desktop, 52px mobile** (capped). Three-line headline must not push the CTA below the fold on a 375px viewport.
- Pillar headlines: 36–40px desktop, ~32px mobile.
- Section sub-headlines (e.g. Section 7 title): 28–32px desktop.

**Glow background:**

- Asymmetric layered radial blur, top-left origin, warmed to coral/rose on the dark surface.
- Appears at the hero and at the final CTA only — bookend treatment. Half intensity on the CTA.

---

## Section 1 — Hero

**Headline (Fraunces, 64px desktop / 52px mobile, three lines):**

> Everything a property
> manager does. None
> of the fee.

**Subhead (Geist, ~17–18px, muted):**

> Rent tracking, contracts, and payment visibility for Brazilian landlords — without paying 8–12% to manage your own property.

**CTAs:**
- Primary pill: `Join the waitlist →` (warm off-white fill `#f5f0e8`, dark text)
- Secondary ghost: `See how ↗` — anchors to Pillar 1

**Mockup peek (breaks the bottom edge of the hero card by 14px):**

A three-row live-billing strip with a `detected yesterday` micro-line under the first Paid row:

```
Rent · April          Paid
                      detected yesterday
Condomínio            Paid
Energia · ENEL    Due in 4d
```

Tabular figures, status pills, real provider name (ENEL) for maturity. A subtle coral spotlight ring sits around the first `Paid` pill — the page's first storytelling-kit moment.

**No eyebrow.** The subhead carries positioning + geography.

---

## Section 2 — Pillar 1: Stay on top of rent and bills

**Section label:** `01`

**Headline (Fraunces, ~36–40px):**

> Stay on top of rent and bills.

**Body:**

> Connect your bank. Invite your tenant to do the same. From that moment on, Mabenn sees every payment as it happens — rent landing in your account, the tenant paying the electric bill, the condo boleto clearing. All of it, seen and confirmed without you asking.
>
> Bills get found the same way. New boletos show up the day they're issued — condo and anything else billed by boleto. For utility bills, Mabenn gives each property its own email address. Point your providers there once — from then on, every bill flows in automatically.
>
> **You don't enter anything. Your tenant doesn't either. Mabenn does it all.**

**Mockup — live billing view (full):**

```
April 2026
R$ 4.350 expected · R$ 3.280 paid

Rent · April 5         R$ 2.800   Paid · detected yesterday
Condomínio · April 10  R$   480   Paid · detected today
Energia · ENEL  · 15   R$   320   Due in 4d
Água · Sabesp   · 20   R$    95   Awaiting
Internet · Vivo · 25   R$   165   Awaiting
```

Mature signals: real provider names, real BRL amounts with tabular figures, `detected today/yesterday` micro-lines under paid rows, status pills (Paid = green-shifted, Due = amber, Awaiting = neutral muted — all per core in-app design system).

**Mobile layout below 480px:** Each row collapses to a two-line stack:
- Line 1: `Provider · date` left, `R$ amount` right
- Line 2: status pill, full-width, left-aligned

**Mechanism triplet (three chips below mockup):**

```
SEES PAYMENTS MOVE          FINDS NEW BOLETOS           UTILITIES EMAIL THE BILL
On both sides — rent        Mabenn knows the day        Your provider sends bills
landing, bills paid,        a boleto is issued.         to Mabenn's address for
condo cleared. All          Condo and beyond.           your property. We read
caught automatically.                                   each one the moment it
                                                        arrives.
```

Open Finance / DDA stay invisible at the page level — surfaced only via tooltip or `↗ how it works` link.

---

## Section 3 — Pillar 2: Never forget the adjustment again

**Section label:** `02`

**Headline:**

> Never forget the adjustment again.

**Body:**

> From the moment a rental contract starts in Mabenn, every key moment is tracked — annual adjustments, renewals, expirations, every charge due date.
>
> When your IPCA adjustment is coming, Mabenn proposes the new rent. You and your tenant review and agree in the platform. When the contract is approaching expiration, both sides see the renewal window with time to talk it through.
>
> If rent comes in late, Mabenn drafts every notice required by the Lei do Inquilinato — including the paperwork you'd need if it escalates to eviction proceedings.
>
> **Have a question? Ask Mabenn.** The AI assistant knows the Lei do Inquilinato — tenant rights, eviction process, every regulation — and your specific contract. Both landlord and tenant can ask. Same answers, same source.
>
> Every notification, proposal, and reply lives in Mabenn. No WhatsApp threads. No scattered emails. One trustworthy record from signing to renewal.
>
> **You don't track. You don't draft. Mabenn keeps the contract running.**

**Mockup — contract timeline:**

```
Contract · Apt 23B, Vila Mariana
Started August 2024 · Ends January 2027

●  Today
│  Rent R$ 2.800/mo
│
○  Next adjustment · Aug 5, 2026
│  R$ 2.800 → R$ 2.937   IPCA +4.89%
│  [ Sent to tenant · awaiting reply ]
│
○  Renewal window · Nov 2026
│
◉  Contract ends · Jan 5, 2027
```

Marker treatment:
- **Today** = filled dot with a thin coral spotlight ring (storytelling-kit signature use).
- **Future events** = outlined circle.
- **Expiration** = heavier double-stroke ring.
- **IPCA delta** shown inline as an arrow (`R$ 2.800 → R$ 2.937`) rather than buried in a parenthetical.
- `Sent to tenant · awaiting reply` chip is a subtle nod to in-platform agreement.

**Mechanism triplet:**

```
EVERY KEY DATE              ADJUSTMENTS + NOTICES         ASK MABENN
Annual adjustments,         When the rent adjustment      AI that knows Brazilian
renewals, expirations.      comes due, Mabenn             rental law and your
Mabenn tracks them all      suggests the new amount.      contract. Both sides
and nudges both sides       Late payment? It drafts       can ask.
before each one.            the formal notice.
```

---

## Section 4 — Pillar 3: Build trust, take it with you

**Section label:** `03`

**Headline:**

> Build trust. Take it with you.

**Body:**

> In Brazil, a good tenant gets stuck behind fiadores and caução. Mabenn replaces those with something stronger: a verified payment record that follows you to every Mabenn landlord.
>
> Landlords build the same kind of record — responsiveness, fair adjustments, contracts honored. Portable reputation is something no property manager offers.
>
> No fake reviews. No drive-by ratings. Just the receipts.
>
> **Trust isn't promised. It's earned. And it follows you.**

**Mockup — two reputation cards, vertically stacked on mobile (<768px), side-by-side on desktop:**

**Tenant card:**

```
Carla Andrade · Tenant
★ 4.87

24/24    rent payments on time
17/18    bills paid on time
1.4 days early on average
No disputes in 2 years
2 rentals on Mabenn

May 5    Paid rent on time           R$ 2.800
Apr 28   Paid condo 3 days early     R$   480
Apr 15   Paid Energia ENEL on time   R$   320
Mar 5    Accepted IPCA adjustment    +4.89%
Feb 5    Paid rent on time           R$ 2.800
```

**Landlord card:**

```
Brandon Fleming · Owner
★ 4.92

Replies in under 1.2 days
All IPCA adjustments at or below inflation
6/6 contracts completed
4 of 5 tenants renewed
3 properties · 22 months

May 12   Replied to tenant in 4 hours
Apr 22   Sent IPCA adjustment at inflation rate    +4.89%
Apr 10   Renewed contract · Apt 12A
Mar 15   Resolved dispute in 8 days
Feb 2    Added property · Vila Mariana
```

**Reputation rating computation (concept-level — for the implementer to lock when the real product surfaces ship):**

- Float on a **1.0–5.0** scale, displayed as `★ X.XX` (Airbnb-style).
- Weighted average of normalized sub-metric scores, anchored to a Bayesian prior at 4.0 that decays as observed events accumulate.
- New users start at 4.0 (not 5.0). Score has to be earned upward as much as defended downward.
- Recency-weighted: events in the last 12 months count ~2× older ones.
- **Tenant weighting:** heavy on payment punctuality (rent + utilities + condo), with dispute frequency and history length as secondary.
- **Landlord weighting:** heavy on responsiveness, contract honor, and adjustment fairness, with dispute resolution and history length as secondary.
- Anchor descriptions for the actual displayed rating:
  - **5.00** — Perfect record. Every payment / commitment on time. No open or lost disputes.
  - **4.50** — Strong record with minor friction. One or two late payments under 5 days.
  - **4.00** — Default for new users.
  - **3.50** — Repeated lateness, one lost dispute, or chronic slowness.
  - **3.00** — Pattern of missed obligations. Formal late notice issued.
  - **Below 3.00** — Severe events: eviction proceedings, repeated lost disputes, contract abandonment.

**Tenant metric vocabulary (for landing page mockup; implementer extends in real product):**

| Metric | Event behind it |
|---|---|
| Rent payments on time | Open Finance match credits LL account ≤ due date |
| Bills paid on time | Utility + condo charges marked paid before due date |
| Days early on average | Mean delta between payment-detected date and due date |
| Disputes opened against | Count of disputes filed by LL with tenant as respondent |
| Rentals on Mabenn | Distinct contracts completed (portability evidence) |

**Landlord metric vocabulary:**

| Metric | Event behind it |
|---|---|
| Replies in under X days | Median time-to-first-reply on tenant-initiated threads |
| IPCA adjustments at or below inflation | % of adjustments proposed at or below published IPCA |
| Contracts completed | Contracts run to natural end without LL-initiated early termination |
| Tenants renewed | % of expiring contracts that signed renewal |
| Properties × months | Active properties + months on platform |

**Design rules for the cards:**
- **`★ X.XX` is the page's Airbnb-style anchor.** Star leads, number follows. Float displayed with two decimal places.
- Numerical evidence sits directly below the rating — concrete events back up the score.
- Activity log feels like a credit report — plain timestamps, plain events, verb-leads-with-action (`Paid rent on time`, not `Rent paid on time`).
- Progress fill bar (not used in current layout but available if the implementer needs one): 4–6px tall, hairline track (`rgba(255,255,255,0.08)`), coral/rose fill at the level reached.
- Tabular figures throughout, hairline divider between cards (vertical on desktop, horizontal on mobile).

**Mechanism triplet:**

```
EARNED FROM EVENTS          PORTABLE                      BOTH SIDES
Every on-time payment       Move to a new tenant or       Tenants build a payment
counts. No fake reviews.    landlord — your history       history. Landlords build
No drive-by ratings.        comes with you.               a responsiveness record.
Just the receipts.                                        Same rules, same scale.
```

---

## Section 5 — The revenue moment

Not a numbered pillar — a bridge section between the three pillars and the comparison. No `04` label; the headline opens the section directly. **120px breathing room above and below** — this is the page's emotional center.

**Headline:**

> Watch your rental income grow.

**Body:**

> Every paid rent, every cleared bill, every adjustment — Mabenn rolls them up into the only view that really matters: how much you're making.
>
> See this month's income. See the year. See the lifetime of every contract. Across all your properties, or zoomed into one.
>
> The numbers are real, sourced from real payments — not your memory, not your spreadsheet.

**Mockup — revenue dashboard (concrete spec, not ASCII):**

- **Container:** Card surface `#1a1a19`, `rounded-[24px]`, hairline border. Breaks the container right edge by 14px (peek treatment).
- **Headline metric:** `R$ 28.400` rendered in Fraunces ~40px, off-white, tabular figures, on its own line.
- **Delta:** `+12% vs 2025` directly under, in Geist ~14px, coral fill swatch + number, separated from the headline by 8px.
- **Chart:** SVG line chart, 12 data points (J–D), **1.5px stroke**, **coral gradient stroke transparent → full opacity at right edge** (sells the "rising" feeling visually as well as numerically). Cumulative monotonic-up curve.
- **X-axis labels:** `J F M A M J J A S O N D`, Geist ~11px tertiary muted, tabular figures, evenly spaced.
- **Subtle dotted gridline** at the YoY-comparison anchor (the value of R$ 28.400 ÷ 1.12 = ~R$ 25.357 from 2025) drawn as a 1px dotted line in `rgba(255,255,255,0.08)`. Labeled `2025` muted at the line's right edge.
- **Footer ground line:** `3 properties · R$ 8.937 collected in April`. Geist ~13px, muted.
- **Animation:** On scroll-in, line draws left-to-right via stroke-dash animation (~900ms ease-out). One-shot, no replay on locale switch or back-navigation.

The cumulative line is **the one place on the page where the coral/rose accent is loud** — moment of signal per editorial reference.

**View-dimension chips (instead of mechanism triplet for this section):**

```
THIS MONTH                  THIS YEAR & LIFETIME          ACROSS PROPERTIES
What's coming in right      Cumulative income for         All your rentals on
now, broken down by         every contract and every      one dashboard, or
property.                   year you've owned.            zoom into any one.
```

---

## Section 6 — Comparison: vs property managers

**Headline:**

> All the expertise. None of the management fee.

**Body intro:**

> Property managers charge 8–12% for what's mostly tracking, paperwork, and chasing payments. Mabenn does that — automatically, for both sides. The expertise comes from an assistant that knows Brazilian rental law and your contract. You handle the property. Mabenn handles the know-how.

**Comparison table (6 rows):**

```
                        Property manager              Mabenn
─────────────────────────────────────────────────────────────────────
Monthly fee             8–12% of rent                 No management fee

Expertise               Their team,                   AI that knows Brazilian
                        on their schedule             rental law and your
                                                      contract

Tax reporting           Automatic                     You stay in control

Tracking                Monthly reports               Live, automatic,
                                                      both sides

Communication           Through them                  Direct, in-platform

Tenant trust            —                             Portable reputation
─────────────────────────────────────────────────────────────────────
```

Visual treatment:
- Two-column table on desktop, **stacks to a card-per-row** on mobile.
- Hairline dividers between rows. No gridlines.
- Property-manager column muted (`#a8a29e`). Mabenn column rendered in `#f5f5f4` with row labels in tertiary muted (`#78716c`). Mabenn column wins by typography weight, not by accent color.
- **No display-serif treatment on the "No management fee" cell.** The closing math figure (below) is the section's sole moment of accent.
- Row stagger: **100ms per row** on scroll-in.

**Deliberately left out:**
- "Contract management" — ✓✓ wash, dilutes punch.
- "Maintenance coordination" — they have it, the landing doesn't make claims about it. Out of scope for this comparison's frame.
- "Setup" — operational, not emotional.

**Closer (the math — promoted to memorable-moment status):**

Rendered in **Fraunces ~36–40px** (display serif at hero-adjacent size), not body sans. This is the page's punchline — give it real estate.

> On a R$ 2.800 rent, that's **R$ 3.500 – R$ 4.000 every year.** Out of your pocket. Every year you own the property.

The `R$ 3.500 – R$ 4.000` figure is rendered in the coral/rose accent. The page's second permitted moment of signal (after the revenue chart's cumulative line).

---

## Section 7 — Two sides of the rental

**Section title (Fraunces, ~28–32px):**

> Two sides of the same rental.

No subtitle. Two columns, side by side on desktop, stacked on mobile (LL first).

**Left column — For landlords:**

- See what you're making — every month, every year, every contract.
- Stop chasing rent. Stop asking if bills got paid.
- Never miss an adjustment, renewal, or late notice.
- Handle late payments — without hiring a lawyer.
- Every conversation kept on record, in Mabenn.

**Right column — For tenants:**

- A verified payment history that follows you to your next rental.
- See what you owe. Watch every payment clear automatically.
- Know rent adjustments before they happen — and why.
- Read your contract in plain Portuguese, not legalese.
- Talk to your landlord directly, in Mabenn.

Visual: coral/rose check glyph at the start of each bullet (the section's only color signal). Hairline vertical divider between columns on desktop. Mobile order: LL first, then tenant.

---

## Section 8 — Final CTA

**Headline:**

> Take back the 8–12%.

**Body (one line):**

> Mabenn launches in Brazil soon. Get on the list.

**Form:**

```
[ you@example.com                  ] [ Get on the list →  ]
```

- Email input + primary pill button. Input transparent with hairline border; button warm off-white fill with dark text and arrow glyph.
- On submit: row replaced with success state — `✓ You're on the list. We'll be in touch.`

**Fine print (muted, ~13px):**

> No spam. We'll only email you when Mabenn opens for new users.

**Layout:** center-aligned. Asymmetric glow re-appears at half intensity — bookend with the hero.

**Motion:** On scroll-in: headline fades up, then body, then form, then fine print. 100ms stagger.

---

## Footer

```
mabenn                Privacy   Terms   [ PT-BR ▾ ]
© 2026
```

- Wordmark + copyright left, two doc links + locale switcher right.
- Locale switcher: shows `EN` / `PT-BR` / `ES`. Defaults to browser-detected locale. Selection persists via the existing `next-intl` mechanism.
- Hairline top border, faint.
- Tiny serif version of the wordmark.

---

## Localization

All copy written in `messages/{en,es,pt-BR}.json` simultaneously. No EN-only ship.

Suggested top-level namespace: keep the existing `landing` namespace, replace all keys. Planner decides exact key naming. Brazilian-specific terms (IPCA, Lei do Inquilinato, fiadores, caução, condomínio, boletos) keep their PT-BR form across all locales since they are proper nouns / institutional terms — translating them would obscure meaning. EN/ES copy can add brief gloss in parentheses where helpful, but should not invent equivalents.

The mockups also need localization. Provider names (ENEL, Sabesp, Vivo) and currency (R$) stay constant across locales — they are part of the Brazilian context the page describes. Status labels ("Paid", "Due in 4d", "Awaiting"), metric labels ("rent payments on time", "Replies in under 1.2 days"), and activity log verbs translate.

---

## Mockup approach

Mockups are **partial sections of a mature product**, not entire app pages. Five mockups total — each rendered as a real component with mock data.

**Mockup components are MARKETING-ONLY and deliberately throwaway** — they live at `src/app/(public)/mockups/` (planner confirms the path) with an explicit header comment `// MARKETING ONLY — do not import into /app/*`. They are NOT a future component-library seed. Coupling them to real product components would either cramp the product UI (forced to match the mockup) or make the seed argument moot (rewrite at launch). Keep them separate by design.

| Section | Mockup |
|---|---|
| Hero | 3-row live billing peek (with `detected yesterday` micro-line + coral spotlight ring on the first Paid pill) |
| Pillar 1 | Full live billing view (5 rows + aggregate + period). Mobile row layout collapses to two-line stacks below 480px. |
| Pillar 2 | Contract timeline (4 milestones, one active proposal). Today marker has thin coral spotlight ring. IPCA delta shown inline as arrow. |
| Pillar 3 | Two reputation cards (tenant + LL). Side-by-side desktop; vertically stacked below 768px. `★ X.XX` rating prominent. |
| Revenue moment | Cumulative income SVG line chart with coral gradient stroke + per-property footer. |

Each mockup must:
- Use tabular figures for every money rendering.
- Show realistic Brazilian data (real provider names where applicable, BRL amounts, PT-BR-flavored property names).
- Include at least one timestamp or `detected today / yesterday` micro-signal.
- Match the warm-dark surface palette and hairline-border treatment from the aesthetic baseline.
- Animate in once on scroll-in with restrained motion (per the baseline).
- Use the coral/rose accent for at most one signal element (e.g., a spotlight ring, the cumulative line, the rating star).

---

## Out of scope (deliberate — what's NOT on this landing page)

These would be the wrong things to add to this page even if the product supports them later:

- Dedicated /pricing, /features, /about pages.
- Customer logos / press-mention strip.
- Video / animated explainer.
- Cookie banner redesign (existing one stays).
- Sign-up CTA (waitlist only this round).
- Maintenance request workflow specifics (the LL reputation card abstracts to "response time" rather than ticket counts).

---

## Follow-ups for implementation phase

These don't block the spec but need to be handled when the page ships:

1. **Font procurement.** Self-host **Fraunces** and **Geist Sans** via `next/font` in `src/app/layout.tsx`. Both are open-source / free.
2. **Pluggy / Belvo decision.** The "Open Finance" copy is provider-agnostic but the eventual link / disclosure copy may need to name the partner. Revisit when Phase 0 spike resolves.
3. **Provider-coverage messaging.** Current copy says "your provider" generically. If the launch list of supported utility providers is limited, the page may need a "supported providers" subtle reference or a regional rollout disclaimer. Revisit at launch.
4. **Pricing model.** "No management fee" dodges the subscription-vs-free question. Once pricing is decided, the comparison table's "Monthly fee" row may need updating.
5. **Editorial accent across surfaces.** The coral/rose accent currently lives only on storytelling surfaces; the in-app teal is separate. If a future brand pass harmonizes them, the editorial reference doc + this spec both need updating.

---

## Done state

The landing page:

- Renders at `/` in EN, PT-BR, and ES.
- Has all eight sections in order (hero → pillars 1/2/3 → revenue → comparison → two-sides → CTA + footer).
- Uses the editorial dark aesthetic across the entire page (no light-mode remnants).
- Shows five mockups with mature Brazilian data and Airbnb-style ratings on the reputation cards.
- Captures waitlist signups through the existing flow.
- Lighthouse performance / a11y scores unchanged or improved from the current page.
- Mobile experience matches the page's mobile-first ambition — reputation cards stack vertically, billing rows collapse to two-line stacks, comparison table stacks card-per-row.
