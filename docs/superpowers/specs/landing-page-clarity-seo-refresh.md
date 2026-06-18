# Mabenn Landing Page Clarity + Conversion + Attribution — Spec

> Status: draft for review. Source of truth for the landing-page refresh. Plans
> (under `docs/superpowers/plans/`) derive from this spec, one vertical slice at
> a time.
>
> This spec supersedes the externally-provided draft ("Mabenn Landing Page
> Clarity + SEO Refresh") where they conflict. The deltas from that draft are
> listed in **§2 Decisions** — read those first; they reflect choices already
> made with the project owner and the project's existing guidance/memories.

---

## 1. Purpose

Make the Mabenn marketing landing page easier to understand and more
conversion-focused, and make referral traffic measurable. Three outcomes:

1. **Clarity** — a simpler, task-based information hierarchy: who it's for, what
   it helps you do, the landlord jobs in plain language, automation explained
   only after the basic product is clear.
2. **Conversion** — a progressive waitlist that captures a richer lead profile
   without adding friction to the first step.
3. **Attribution** — UTM + referrer captured into the database alongside each
   waitlist row and into PostHog, so referral campaigns (WhatsApp, Facebook
   groups, Reddit, founder network) are measurable.

The page must keep Mabenn's differentiated positioning while leading with the
practical product, not the mechanism.

Primary audience: small landlords in Brazil with 1–5 rentals who self-manage or
want to avoid an imobiliária. Secondary: tenants renting direct, remote owners,
small agents, people comparing options, Brazilians abroad who own BR property.

---

## 2. Decisions (locked) — deltas from the external draft

| # | Decision | Rationale |
|---|---|---|
| D1 | **Sell as if shipped.** No "early access / when available / designed to" hedging on capabilities. Keep only *trust* statements that are honest and load-bearing (read-only bank access, never moves money, doesn't show the other side's bank feed, a lawyer is still the right call for complex disputes). | Overrides the external draft's pervasive "product truthfulness" hedging. Matches the project's established rule that marketing pages sell the mature vision. Trust statements are not scope-gap admissions. |
| D2 | **Task-led hero.** H1 leads with the literal job ("Manage your rental without a property manager" / "Administre seu aluguel sem imobiliária"), revenue is one of the jobs, and revenue remains the strongest single element of the hero visual + the Reporting section (§3.8). | Owner chose task-led for SEO clarity; revenue stays prominent visually per established "revenue is the centerpiece" positioning. |
| D3 | **Progressive waitlist via ResponsiveModal.** The inline email input is the gate; submitting an email opens `ResponsiveModal` (desktop dialog / mobile bottom sheet) with the richer fields. | Owner direction. Low-friction first step, richer profile second. |
| D4 | **Spanish stays internal-only.** No public ES URL, no ES hreflang/sitemap/canonical. `messages/es.json` copy stays complete for in-product ES. | Matches the deliberate existing routing decision (host-determined locale across two domains, no `[locale]` prefix). The draft's ES-SEO asks are impossible without inventing new routing. |
| D5 | **SEO infra is already built — tweak, don't rebuild.** Canonical, cross-domain hreflang, OG (+ dynamic OG images), JSON-LD (Organization + SoftwareApplication + FAQPage), sitemap, robots, and domain→locale redirect already exist and are host-aware. Scope is: refine meta title/description copy, add an `offers` node to the SoftwareApplication JSON-LD, and keep FAQPage JSON-LD in sync with the rewritten FAQ. | The draft assumed greenfield SEO; it is not. See §8. |
| D6 | **UTM = first-touch.** Capture `utm_*` + referrer + landing path on first load into `sessionStorage`, persist onto the waitlist row, and attach to the `waitlist_joined` event. Do not store paid click IDs in the DB (PostHog already captures them). | Owner ask; first-touch answers "who sent them." |
| D7 | **Update existing marketing guidance, don't create new.** Update `docs/marketing/positioning-and-messaging-foundation.md`. No new `.claude/rules/*` or `.claude/skills/*`. | The draft's cleanup rule; the guidance doc exists. |
| D8 | **Build straight to React** (no `docs/design-references/` HTML mockup this round). | Owner direction; the page is already styled. |

---

## 3. Information architecture (new section order)

Top → bottom. Sections marked **new** don't exist today; the rest are rewritten
and/or reordered from the current single `landing.tsx`.

1. **Header / sticky nav** — logo, nav (How it works · Pricing · FAQ), waitlist
   CTA. **No sign-in button** (removed). Mobile: logo + CTA + menu.
2. **Hero** — task-led H1, subhead, primary CTA (waitlist) + quieter secondary
   CTA ("See how it works" → scrolls to How it works), founding-member note,
   tenant link. Keep the existing editorial product screenshot(s) as the hero
   visual — do not replace or restyle the imagery (§12).
3. **Quick jobs grid (new)** — 6 scannable cards: **Rent & bills** · **Reporting**
   · **Contracts** · **Maintenance** · **Messages** · **Everything in one place**.
   Notes:
   - **Rent & bills** — money in and out in one card: rent landing + condo, IPTU,
     water, power, gas, internet, tracked by month (maps to §3.5).
   - **Reporting** — the financial-visibility card: what each rental earns and
     what it's worth, returns after costs, estimated value, rent vs. comparable
     properties (maps to §3.8). Working label "Reporting" (*Relatórios* /
     *Reportes*) — adjustable; the §3.8 section keeps a benefit-driven headline.
   - **Contracts** — framed as the **whole lifecycle**: first lease → annual
     adjustments → renewal → move-out (not just "key dates").
   - **Maintenance** — framed as the **whole lifecycle**: request → photos →
     back-and-forth → looping in an outside pro → resolution, all on record (not
     just the request).
   - **Everything in one place** — kept as the *central-source* card ("Mabenn is
     the one place everything about the rental lives") and sits **last** as the
     synthesis. Working label "Everything in one place" (*Tudo em um só lugar*);
     alternatives pending owner pick: "Your rental's hub / A central do aluguel".
4. **How it works (new)** — 4 steps: **Add your rental** (property, tenant,
   contract, rent, key dates — kept high-level; do **not** enumerate the
   upload-contract-vs-manual-entry mechanic here, it's a setup detail that
   belongs in the flow) → **Connect what you want tracked** (bank connection for
   payment confirmation, bill sources) → **Invite the tenant** (their own view,
   same shared record) → **Mabenn keeps the record updated** (the "passive by
   design" payoff: rent confirmed as it's paid, bills as they're issued, contract
   dates before they matter, messages logged — without manual entry). Automation
   explained here, after the model is clear.
5. **Feature: Rent & bills** — "Know what was paid without asking."
6. **Feature: Contracts** — adjustments, renewals, key dates. Keep the
   lawyer-for-complex-disputes trust line.
7. **Feature: Messages & maintenance** — out of the WhatsApp chaos; on record.
8. **Feature: Reporting (financial visibility)** — broader than revenue: the
   full financial picture of each rental. Covers (a) revenue — what each rental
   earns, month/year/lifetime; (b) costs — condo fees, IPTU, maintenance,
   mortgage; (c) monthly/annual **return after costs** (net yield); (d)
   **estimated property value**; (e) **current rent benchmarked against similar
   properties in the area**. User-facing headline is benefit-driven (avoid the
   dry "Reporting"/accounting-software tone — the product feels like Mercury/Linear):
   working headline "See how your property is really doing" / *"O panorama
   financeiro completo do seu aluguel"* (owner to confirm). Note: (d) estimated
   value and (e) market comparison imply external valuation/market data; per D1
   they're presented as shipped. The grid's **Reporting** card points into this
   section. **Needs a new editorial screenshot** showcasing the
   financial-visibility view (revenue + costs + net return + estimated value +
   market-rent comparison) — the current revenue-tracking screenshot doesn't
   represent this expanded feature. This is the one exception to the
   keep-existing-screenshots rule (§12); production method (owner-provided design
   vs. built mockup) is settled when planning this slice.
9. **Track record & screening (new — replaces the current "Build trust. Take it
   with you" Pillar 3)** — one combined section, two beats:
   - **Portable track record** — both landlord and tenant build a reputation from
     real events (on-time rent, settled bills, resolved maintenance);
     verifiable, and it carries to the next rental, on Mabenn or off.
   - **Tenant screening** — before signing, a landlord can check a prospective
     tenant's **credit (Serasa/SPC)** *and* their Mabenn track record.
   Framing rules: keep it **balanced/two-sided** (a strong record helps tenants
   win the next place — not surveillance); the tenant's portable record is part
   of what screening surfaces. Locked headline (plain noun phrase, matches the
   jobs-grid card and §3.3 plain-header rule): **"Track record & screening"** /
   *"Histórico e análise de crédito"* / *"Historial y análisis de crédito"*. Carries
   an ordinal eyebrow (**05**) and sits in the feature run right after Reporting,
   with the editorial screenshot on the **left** (mirrors the Messages &
   maintenance layout). **LGPD flag (build, not
   copy):** credit data is sensitive third-party data with real consent/handling
   obligations; per D1 the copy still presents it as shipped. Placed right after
   Reporting — it shares the same feature-section shape as the other product
   sections, so it belongs in the feature run rather than down by the trust band.
10. **Comparison** — structure of an administradora without the fee. Keep the
    8–12% example; correct the math (see §3.1).
11. **Pricing** — moved up to just after comparison. Values unchanged.
12. **Two-sided rental record** — landlord vs tenant, same truth.
13. **Trust & security** — 3 cards: read-only bank access, hosted in BR, LGPD.
    (The "shared record" card was dropped — redundant with the Two-sided record
    section; this band stays focused on security/privacy.) Sits just before the
    founder section.
14. **Founder transparency (new, short)** — built from a real BR rental workflow.
15. **FAQ** — rewritten to visitor concerns (see §3.2).
16. **Final CTA** — waitlist.

Copy direction per section follows the external draft's wording **reconciled to
D1 (sell as if shipped)** and the project copy guardrails in §3.3. Final EN copy
is drafted and locked first, then translated to PT-BR and ES (content workflow);
the draft's per-locale strings are the starting point, not the final text.

### 3.1 Comparison math (must be accurate)
On R$ 2.800 rent: 8% → R$ 2.688/yr, 12% → R$ 4.032/yr (monthly fee × 12). Use
this corrected range; the current page's "R$ 3.500–4.000" is replaced.

### 3.2 FAQ (rewritten, visitor-concern order)
Is Mabenn available yet? · Who is it for? · Does it replace an imobiliária? ·
How does Mabenn confirm payments? · Can Mabenn move money from my account? · Does
the other side see my bank transactions? · What if my tenant doesn't join? · Is
it free for tenants? · Can I use it for more than one property? · Does it replace
a lawyer? · Is it LGPD-compliant? · Can I cancel anytime? — Answers stay short;
keep the existing accordion. **FAQPage JSON-LD must match the rendered Q&A.**
Note D1: the "available yet" answer states the waitlist/founding-member offer
without hedging shipped capabilities.

### 3.3 Copy guardrails (project memory — apply during drafting)
- **Feature-section headers are plain category names** ("Rent & bills",
  "Contracts", "Messages & maintenance", "Reporting") — matching the jobs-grid
  cards, never clever/benefit lines ("Know what's paid — without asking"). A
  visitor must know what the section is at a glance; the benefit lives in the
  body. Feature sections are **body-only** (header → short body/list → mockup);
  no per-section mechanism lists (that detail lives once in How It Works).
  **List-item titles follow the same rule** — plain noun labels (Revenue, Costs,
  Maintenance, Reputation, Tenant screening), never editorial phrases or verb
  constructions ("Both sides build a record", "Screen who you rent to", "Yours to
  keep"). The label says *what it is*; the explanation goes in the item body.
- **Plain language is the default.** Explain each thing simply and directly. A
  small amount of editorial flourish — in the spirit of the current page — is
  acceptable for memorability, but it must never crowd out clarity. Clarity
  first; cleverness sparingly, never at the expense of being understood.
- "rentals", not "long-term rentals" (aluguel already implies it).
- DDA finds **any boleto** issued to the CPF — not only condo fees.
- Communication-as-record is its **own pillar**, not a sub-feature of the AI assistant.
- Surface that DIY landlording isn't free (lawyer fees for notices/eviction) in problem framing.
- Don't invent concrete customer-workflow steps; characterize honestly at the level we know.
- PT-BR institutional terms (IPCA, Lei do Inquilinato, condomínio, boletos, caução) stay in PT-BR across all locales.
- Lead with revenue value where natural (D2).

---

## 4. Progressive waitlist (UX + behavior)

### 4.1 Flow
- Inline waitlist entry points (hero, sticky nav, final CTA) collect **email
  only** as the gate. Submitting a valid email opens the **waitlist modal**
  (`ResponsiveModal`) with the email pre-filled/carried.
- The tenant link ("Here as a tenant? …") does **not** open the modal directly —
  that would skip the email gate and we'd lose the email. Instead it scrolls to
  and focuses the inline email input and remembers a "tenant" intent, so that
  when the user enters their email and clicks Join, the modal opens with **role
  pre-selected = tenant**. (Email-first holds for every entry point.)
- **Two-phase write (Option A — capture email = the join, then optionally
  enrich).** Clicking Join with a valid email **writes the row immediately**
  (email + locale + utm/referrer/landing_path + the toggle's landlord/tenant
  role). **This is the join** — the person is on the waitlist now. The modal
  opens for **optional** profile enrichment; its submit **enriches the same row**
  (by email) with the full role, property count, workflow, and the optional
  answer. The email is captured even if the modal is abandoned — abandoners are
  fully-joined leads, not partial ones. **Implemented decision (revised from the
  original draft): the welcome + the join event happen at the gate, not the
  enrich step.**
- The Resend welcome email + segment fire **once, at the gate** (the join), using
  the toggle's landlord/tenant role for the flavor. The enrich step never emails.
  The gate write is idempotent (`ON CONFLICT (email) DO NOTHING`); the welcome +
  `identify` + `waitlist_joined` fire only when the row is genuinely new.
- Re-clicking Join with the same email (e.g. close the modal, click again)
  **reopens the modal without a second write or duplicate event** — the form
  remembers the captured email for the session.
- On the gate write: flip the inline form to the success/confirmation state
  (they're on the list) and persist the "submitted" flag (+ role) in
  `localStorage`. The enrich modal opens over it; **closing the modal without
  finishing leaves the confirmation in place** (they already joined). The modal
  submit fires `waitlist_profile_completed` (§6) and closes.

### 4.2 Modal fields (locked values)
1. **Email** — captured at the gate, shown **read-only** ("Your waitlist email"
   + the address). Not editable in the modal: the email is already written and
   welcomed, so allowing an edit here would orphan the prior DB row / Resend
   contact / analytics identity. Changing email = re-join from the inline form.
2. **Role** (required, single-select) — `landlord · tenant · both ·
   imobiliária/property manager · other`. Stored tokens: `landlord | tenant |
   both | imobiliaria | other`.
3. **Number of rental properties** (required, single-select) — `0 · 1 · 2-5 ·
   6-10 · 10+`. Stored tokens: `0 | 1 | 2-5 | 6-10 | 10+`.
4. **Current workflow** (required, **multi-select — "select all that apply",
   ≥1**) — `WhatsApp · email · spreadsheet · bank app · imobiliária ·
   QuintoAndar/marketplace · dedicated software · accountant · other`. Stored
   tokens: `whatsapp | email | spreadsheet | bank_app | imobiliaria | marketplace
   | dedicated_software | accountant | other`, persisted as a **`text[]`** array.
   (`email` added per owner request — people manage over email too.)
5. **Open-ended** (optional, free text, capped ~1000 chars):
   - PT-BR: "Qual é a parte mais difícil de administrar aluguel hoje?"
   - EN: "What is the hardest part of managing rentals today?"
   - ES: "¿Cuál es la parte más difícil de administrar alquileres hoy?"

Role, property count, and ≥1 workflow are required; the open-ended answer is
optional. The email is captured at the gate (not re-entered here), so the whole
modal is optional enrichment. All labels/options localized; no hardcoded copy.

### 4.3 Components & patterns to follow
- `src/components/responsive-modal.tsx` — `open`/`onOpenChange` + `.Header`,
  `.Title`, `.Description`, `.Content`, `.Footer`. Usage refs:
  `delete-property-button.tsx`, `user-menu.tsx`.
- Inputs (implemented): role + property-count = `ui/radio-group` simple radios;
  workflow = `ui/checkbox` multi-select; open-ended = `ui/textarea`. All carry a
  `tone="highlight"` variant so the selected/focus accent is the editorial
  magenta (`--highlight` token) rather than the app's teal `--primary`. Validation
  is a zod schema in `src/schemas/waitlist.ts` (TDD'd), parsed in the modal.
  (The original draft suggested Select for count/workflow; simple radios + a
  checkbox group read calmer and the owner confirmed the switch.)
- Waitlist state: `src/app/(public)/waitlist-context.tsx` (extend to carry the
  email/role into the modal + drive open state across the inline entry points).

---

## 5. Database + server action

### 5.1 Migration (additive, backfilled — `database-migrations` rule)
Implemented in `supabase/migrations/20260617120000_waitlist_progressive_fields.sql`.
Add to `public.waitlist`: `role` CHECK widened to
`('landlord','tenant','both','imobiliaria','other')`; new nullable columns
`property_count text`, **`workflow text[]`** (multi-select), `feedback text`,
`utm_source text`, `utm_medium text`, `utm_campaign text`, `utm_content text`,
`utm_term text`, `referrer text`, `landing_path text`, `completed_at timestamptz`
(null until the modal enrich step). Existing rows keep their values; new columns
default NULL (safe — existing rows predate them). No RLS policy change (writes
stay RPC-only). CHECK constraints: `property_count is null or in (...)`; workflow
`is null or workflow <@ array[...]::text[]` (array containment), so existing NULL
rows pass while non-null values are constrained to the fixed token sets (§4.2).
DB-level the columns stay nullable to protect existing rows; the form requires
count + ≥1 workflow for new submissions.

### 5.2 RPCs (two-phase — Option A)
Two SECURITY DEFINER operations, both `set search_path = public`, both defensive
about token values (fall back to safe defaults — bad role → `landlord`, bad count
→ NULL, unknown workflow elements filtered out of the array):
- **`waitlist_capture`** (gate): insert `email` (lowercase/trim) + `locale` +
  `utm_*`/`referrer`/`landing_path` + the toggle `role`, `ON CONFLICT (email) DO
  NOTHING`. Returns whether a row was newly created (drives the once-only welcome
  + join event).
- **`waitlist_complete`** (modal enrich): update the row by email with `role`,
  `property_count`, `workflow` (text[]), `feedback`, and stamp `completed_at`.
  Returns whether this was the first completion (kept for symmetry; no longer
  gates an email). If no row exists yet (solo complete), upserts a completed row.
Per migration rules, these are **new functions**; the legacy `join_waitlist` is
left intact (now unused by the form).

### 5.3 Server action
Two actions in `src/data/waitlist/actions/`: a **capture** action (gate) that
calls `waitlist_capture` and, **when the row is new, sends the welcome + adds the
Resend contact** (this is the join — the welcome belongs here, where it can't be
missed by a modal abandon); and a **complete** action (modal enrich) that calls
`waitlist_complete` and does **not** email. **Resend segment mapping** uses the
gate's landlord/tenant toggle (only landlord/tenant segments exist): `tenant →
tenant segment + tenant welcome`; everyone else → `landlord segment + landlord
welcome`. Resend is best-effort; the DB write is the source of truth.

---

## 6. Analytics (PostHog) — align to the `analytics` skill

PostHog already auto-captures `$pageview` (with `utm_*` + referrer on the event,
since they're in the URL) and `$initial_utm_*` first-touch person props, and
merges anon→identified on `identify`. So the visitor→join-by-source funnel is
**`$pageview` (filtered to the landing path) → `waitlist_joined`** — no custom
pageview event needed. Add only what `$pageview`/autocapture can't answer:

- **No `landing_page_viewed`** — redundant with the auto-captured `$pageview`
  (which already carries domain, path, and utm_*). Build by-source conversion
  from `$pageview` instead.
- `waitlist_joined` — fired at the **gate** (the join), only on a genuinely new
  signup, with `posthog.identify(email)` immediately before. Props: email,
  locale, role (toggle), domain, CTA location, utm_*. This is the conversion;
  the by-source funnel is `$pageview` → `waitlist_joined`.
- `waitlist_profile_completed` — fired at the modal enrich submit. Props: email,
  locale, role (full 5-set), property_count, workflow (array), utm_*. Measures
  the optional-survey completion rate; abandonment = joined − profile_completed.
- **Dropped `landing_waitlist_started`** — with the join now at the gate, it
  collapsed into `waitlist_joined`; a separate "started" event is redundant.
- **Deferred** (owner): `landing_cta_clicked` with CTA location — revisit later.
  Do **not** bulk-add the external draft's full ~11-event list; add only events
  that answer a funnel question, per the skill's philosophy.

Use the `captureEvent` wrapper (`src/lib/analytics/capture.ts`). UTM read util:
new small first-touch helper (read `window.location.search` on first load →
`sessionStorage`), unit-tested (TDD). Note: PostHog inits in **production only**;
DB capture works in every env, so attribution is verifiable on prod
(`mabenn.com.br`), where referrals land.

---

## 7. Privacy policy (all three locales)

Content lives in markdown: `src/content/legal/privacy/{en,pt-BR,es}.md` (metadata
keys in `messages/*.json` under `legal.privacy`). Processors (Supabase, PostHog,
Vercel, Resend) are **already listed** — no change there. Update the **"data we
collect (waitlist)"** section in all three files to add: role (expanded), number
of rentals, current workflow, optional free-text answer, and analytics/marketing
attribution data (UTM parameters, referrer, landing path). Keep legal basis =
consent for the waitlist submission and legitimate interest for analytics;
ensure the cookies/tracking section still reflects UTM capture. Reconcile the
"what we collect today" list so it matches what the new form + attribution
actually store. PT-BR served at `/privacidade`.

---

## 8. SEO (tweaks only — infra exists)

- Refine `MARKETING_META` titles/descriptions (`src/lib/marketing-meta.ts`) for
  search intent: PT-BR toward "administração de aluguel sem imobiliária"; EN
  toward "rental management for Brazilian landlords". Keep host-aware behavior.
- Add an `offers` node (R$ 49 / BRL, matching current pricing) to the
  SoftwareApplication JSON-LD in `src/app/(public)/page.tsx`. Optionally set
  `applicationCategory` consistently.
- Keep FAQPage JSON-LD sourced from the same message keys as the rendered FAQ so
  they can't drift (already the pattern).
- No changes to canonical/hreflang/sitemap/robots/proxy logic beyond what the
  copy/route set requires. ES remains excluded from public SEO (D4).
- H1 = exactly one per page; semantic sections; alt text on images.

---

## 9. Marketing guidance update

Update `docs/marketing/positioning-and-messaging-foundation.md` to reflect: the
task-based information hierarchy, jobs-before-mechanisms ordering, the hero
secondary-CTA pattern, sell-as-shipped tone (D1), and the copy guardrails in
§3.3. No new rule/skill (D7). If nothing in the doc conflicts, note that.

---

## 10. Open decisions
1. **RESOLVED** — Resend mapping: `tenant → tenant segment + tenant welcome
   email`; `landlord | both | imobiliaria | other → landlord segment + landlord
   welcome email`. (Granular 5-value role is stored in the DB regardless; this
   only affects the email side.)
2. **RESOLVED** — Required fields: email + role + property count + current
   workflow required; open-ended answer optional.
3. **RESOLVED** — Enforce closed-set CHECK constraints on `property_count` and
   `workflow` (DB rejects values outside the fixed token sets).
4. **RESOLVED** — `landing_cta_clicked`: deferred.

---

## 11. Acceptance criteria

**Clarity/copy** — Hero readable in ~5s, task-based, above the fold shows
who-it's-for + what-it-helps + primary CTA + quieter secondary CTA (scrolls to
How it works) + founding-member note. Jobs grid + How-it-works present;
automation not explained before the model is clear. Pricing appears before the
page gets long. Founder section short. All copy via message keys in en/pt-BR/es;
no hardcoded strings; D1 tone throughout.

**Waitlist** — Inline email gate opens the ResponsiveModal (desktop modal /
mobile sheet); tenant link presets role=tenant; modal collects the §4.2 fields
with locked values/options; submit writes the full row; success state shows;
waitlist CTA present in header, hero, pricing, final CTA.

**Data/attribution** — `waitlist` row stores role/count/workflow/feedback +
utm_*/referrer/landing_path; email captured at the gate (two-phase write) so
abandoned modals still leave an email-only lead; RPC + server action updated;
Resend mapping applied and welcome email sent once on completion;
`landing_waitlist_started` + enriched `waitlist_joined` fire with locale + domain
+ utm_*; by-source conversion built from `$pageview`; UTM is first-touch and
survives in-page anchor nav.

**Privacy** — All three privacy markdown files updated for the new collected data
+ attribution; processors confirmed; PT-BR at `/privacidade`.

**SEO** — Meta titles/descriptions refined per locale/host; JSON-LD `offers`
added; FAQPage JSON-LD matches rendered FAQ; no `noindex`; ES still excluded.

**Guidance** — `positioning-and-messaging-foundation.md` updated; no new
rule/skill.

**Verification** — type check + tests + lint pass; code review against this spec.

---

## 12. Out of scope
- Public ES routing / ES SEO (D4).
- Rebuilding the SEO/i18n infra that already exists (D5).
- Storing paid click IDs (gclid/fbclid/rdt_cid) in the DB (PostHog has them).
- Open Finance / DDA / payment matching / any actual product capability behind
  the marketing claims (this is the marketing surface only).
- Replacing or restyling the existing editorial product screenshots / UI
  previews — keep them exactly as they are. This refresh changes copy,
  structure, the waitlist flow, and attribution, not the visual assets. **One
  exception:** the Reporting section (§3.8) gets a **new** editorial screenshot,
  since the current revenue-tracking screenshot doesn't showcase the expanded
  financial-visibility feature — that new asset is in scope (production method
  TBD when planning that slice).
