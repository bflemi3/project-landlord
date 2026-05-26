# Growth Task List — Waitlist → Funding Conversation

**Date:** 2026-05-24
**Owner:** Brandon (founder)
**Goal:** Build a waitlist large enough to support a funding conversation with Alex in **3–6 months**.
**Constraints:** Self-funded, evenings/weekends only. Organic-first; revisit paid after the first month of signal.
**Market:** Brazil. Brazilian landlords (and real estate agents) + tenants. PT-BR-first.

This list pairs with `docs/project/seo-strategy.md` (the framework) and `docs/marketing/positioning-and-messaging-foundation.md` (the message).

---

## Legend

- **[YOU]** — only you can do this (accounts, posting, conversations, money)
- **[ME]** — I can do most of this on my own; you review the result
- **[US]** — we work together; I draft, you decide, we iterate

---

## Sequencing logic

Three workstreams run in parallel, but priorities differ:

1. **Foundation (week 1–2)** — measurement, LinkedIn company page, accounts. Without these, nothing else compounds or attributes.
2. **Headline waitlist driver (week 1 → ongoing)** — founder content on LinkedIn + community seeding. This is what fills the waitlist in the 3–6 month window.
3. **Compound moat (week 2 → month 6)** — per-locale URLs, cornerstone articles, on-page SEO. Won't move the needle by month 2, will be carrying real traffic by month 5–6.

Do the foundation work first. Start founder content the moment the LinkedIn company page is live. Layer SEO work in parallel.

---

## Track 1 — Foundation & Measurement (week 1)

Without measurement, optimization is guessing. Without LinkedIn presence, founder content can't start.

| # | Task | Who | Notes |
|---|---|---|---|
| 1.1 | Create Mabenn **LinkedIn company page** | [YOU] | ~30 min. Need: logo, banner, tagline, about (PT-BR), website link, industry, location. Prereq for everything in Track 2. |
| 1.2 | Optimize your **personal LinkedIn profile** (headline, banner, about, current role = "Founder, Mabenn") | [YOU] | Algorithm favors personal posts over company posts ~4–10x. Your personal profile is the primary distribution channel. |
| 1.3 | Draft your LinkedIn profile copy (headline, about) leaning into "American building tools for Brazilian small landlords" | [US] | I draft EN → you adjust → translate → engineer review |
| 1.4 | Set up **Google Search Console**, verify both `mabenn.com` and `mabenn.com.br` | [YOU] | Verification can be done via DNS (Vercel domain dashboard) or HTML meta tag (I can add the meta tag to layout) |
| 1.5 | Set up **Bing Webmaster Tools**, verify both domains | [YOU] | Free, small additional surface, takes 5 min once GSC is done (can import) |
| 1.6 | Audit current site: Lighthouse score, sitemap.xml, robots.txt, OG image, schema validation | [ME] | I run Chrome DevTools MCP lighthouse against the deployed page, document baseline numbers, list issues |
| 1.7 | Verify PostHog `waitlist_joined` event fires with `source` / `utm_*` attribution properties | [ME] | Read the event flow, confirm UTM params propagate from URL → PostHog person properties |
| 1.8 | Define and document the **weekly growth dashboard** — what we look at every Monday | [US] | Metrics: waitlist signups (total + by source), LinkedIn impressions/followers, GSC impressions+clicks, top-of-funnel events. I draft, you approve. |
| 1.9 | Set up a UTM convention + a tagging helper so every external link is attributable | [ME] | Tiny utility + a `docs/marketing/utm-conventions.md` cheatsheet |

---

## Track 2 — Founder Content on LinkedIn (week 1 → ongoing)

This is the highest-leverage short-term lever. The "American in Brazil building for Brazilian landlords" angle is a differentiated POV worth leaning into hard.

### 2A — Strategy & cadence

| # | Task | Who | Notes |
|---|---|---|---|
| 2.1 | Define **3–5 content pillars** (themes you'll rotate through) | [US] | My starting proposal — see below. You react, we lock. |
| 2.2 | Lock posting **cadence** — recommend **3x/week** to start (Mon/Wed/Fri, 8am BRT). Daily is unsustainable in free time. | [US] | We'll commit only to what you can actually sustain for 12 weeks. Consistency >>> volume. |
| 2.3 | Pick a **content production rhythm** — recommend batch-drafting 6 posts every other Sunday | [US] | Avoids "what do I post today" friction. We draft in batches together. |
| 2.4 | Decide which engineer collaborates on PT-BR native review and at what cadence | [YOU] | Async batch review every 1–2 weeks works fine if posts are batched |

### 2B — Proposed content pillars (for review)

I'd anchor everything around these five — each addresses a different angle of the wedge:

1. **Brazilian landlord pain stories** — IPCA adjustments, late payments, the lawyer-letter cost, the imobiliária 8–12% tax, the silent CPF on DDA you didn't know about. One real or composite story per post.
2. **"How does this actually work in Brazil?" educational** — Lei do Inquilinato basics, IPCA calculation walkthroughs, Receita Federal rules around rental income, what DDA is, how Open Finance changes things. Anchors you as someone who understands the system.
3. **Building in public** — what we shipped this week, what we're learning, what surprised us. Lowest-effort content, highest-trust signal.
4. **Gringo POV** — "what I didn't understand about Brazilian landlording until I tried it." Honest outsider lens. Differentiated and shareable. Probably your single highest-reach content type if executed well.
5. **Mabenn's product philosophy** — why we don't auto-report to Receita Federal, why the tenant sees what you see, why we built bill-holder flexibility, why rent comes first. Sells the product without being an ad.

### 2C — First batch of posts (do these together)

| # | Task | Who | Notes |
|---|---|---|---|
| 2.5 | I draft **first 6 LinkedIn posts in EN** covering each pillar at least once | [ME] | Will share for review before any translation |
| 2.6 | You react / edit substance and voice | [YOU] | This is the "lock the message" step — what tone do you want, what stories are real, what's off-limits |
| 2.7 | I produce PT-BR translations of the locked EN drafts | [ME] | First-pass translation |
| 2.8 | PT-BR engineer does native review, flags translation tells, suggests natural phrasing | [YOU/engineer] | Block on this before publishing. The cost of sounding non-native to Brazilians is high. |
| 2.9 | You publish on schedule with the agreed UTM tags on any links | [YOU] | Use a scheduling tool (Buffer/Hypefury/Typefully free tier) if it removes friction; manual is fine too |
| 2.10 | After 2 weeks of posts, we look at PostHog + LinkedIn analytics together and adjust pillars/cadence | [US] | Don't fix what's working, kill what's not |

### 2D — LinkedIn engagement (the multiplier)

Posting is half the work. Engagement is the other half.

| # | Task | Who | Notes |
|---|---|---|---|
| 2.11 | Identify 20–50 **Brazilian small-business / fintech / real-estate creators** and follow them | [YOU] | I can help find them via search if useful, but this is judgment work |
| 2.12 | Commit to **15 min/day of thoughtful comments** on their posts (not "great post!" — substantive add-on) | [YOU] | This is how LinkedIn rewards new accounts. Algorithm sees you're a real participant. |
| 2.13 | DM 3–5 Brazilian landlords/tenants/week to start conversations (not pitches) | [YOU] | Pure curiosity: "saw your post about X, curious how you handle Y?" Builds source for future case studies. |

---

## Track 3 — Community Seeding (week 2 → ongoing)

Lower-volume than LinkedIn but high credibility when authentic. The rule: **be useful first, mention Mabenn only when it genuinely fits**.

| # | Task | Who | Notes |
|---|---|---|---|
| 3.1 | Join target Brazilian Facebook groups: *Proprietários de Imóveis*, *Locação SP*, *Locação RJ*, similar | [YOU] | I can compile a list of candidates from search results, you vet and join |
| 3.2 | Join target subreddits: r/brasil, r/imoveis, r/empreendedorismo, r/financaspessoais | [YOU] | These are EN-friendly read but you should post in PT-BR |
| 3.3 | Find 2–3 landlord WhatsApp groups (via Facebook group connections or LinkedIn DMs) | [YOU] | These are gold but require relationships first |
| 3.4 | Draft **3 "value-add introduction" posts** for each channel type (FB group, Reddit, WhatsApp) | [US] | NOT "check out Mabenn" — answer a common question with depth, sign as founder of Mabenn |
| 3.5 | Lock a **participation policy** for yourself: weekly cap, what counts as a Mabenn-relevant question to answer, no-spam rules | [US] | I draft, you approve. Prevents you accidentally getting banned. |
| 3.6 | Commit to **30 min/week** answering questions in these communities | [YOU] | Time-boxed so it doesn't eat the week |

---

## Track 4 — Per-Locale URL Structure (week 2–3)

The single biggest technical SEO lever. Without this, the Brazilian site is invisible to Google.

| # | Task | Who | Notes |
|---|---|---|---|
| 4.1 | Confirm both `mabenn.com` and `mabenn.com.br` are pointed at the Vercel deployment | [YOU] | Both purchased per your confirmation; Vercel dashboard step |
| 4.2 | Decide routing strategy: **domain-based** (`mabenn.com` = EN, `mabenn.com.br` = PT-BR) vs **pathname-based** (`mabenn.com/pt-br`) | [US] | I'll write a short trade-off doc — recommendation up front is **domain-based** since you own both TLDs and PT-BR is the primary market |
| 4.3 | Create Linear issue `PRO-XXX` for the routing change | [ME] | Per `linear-github.md` — new branch, draft PR, the works |
| 4.4 | Implement `next-intl` routing change in own PR | [ME] | Touches `i18n/routing.ts`, `i18n/request.ts`, middleware, sitemap, robots |
| 4.5 | Emit per-locale metadata (title, description, OG, canonical, hreflang alternates) | [ME] | Part of the same PR |
| 4.6 | Update `src/app/sitemap.ts` to emit per-locale URLs with `alternates` cross-references | [ME] | Same PR |
| 4.7 | After deploy, **submit both sitemaps** in Google Search Console and Bing | [YOU] | Both `mabenn.com/sitemap.xml` and `mabenn.com.br/sitemap.xml` |
| 4.8 | Validate hreflang via Google Rich Results Test + manual `curl` headers | [ME] | Part of the verification at end of PR |

---

## Track 5 — Content Engine: First 5 Cornerstone Articles (week 3 → month 3)

This is where compound organic traffic comes from. Each article = a search-intent landing surface + authority signal + waitlist CTA.

| # | Task | Who | Notes |
|---|---|---|---|
| 5.1 | Decide blog URL structure: `/blog`, `/aprenda`, or `/recursos` | [US] | My recommendation: **`/aprenda`** — PT-BR-native feel, "learn" framing positions Mabenn as educator. I'll write a one-paragraph rationale; you approve. |
| 5.2 | Pick the **5 cornerstone topics** from `seo-strategy.md`'s query table | [US] | I'll propose 5; you approve or swap. Likely candidates: IPCA reajuste 2026 guide, Lei do Inquilinato despejo cascade, alternativa à imobiliária, DDA explained for landlords, IR aluguel recebido. |
| 5.3 | Draft cornerstone article outlines (EN) | [ME] | One outline per article — H1, H2s, key facts to verify, target queries, internal links |
| 5.4 | You review outlines, lock the structure | [YOU] | Substance check + "is this honest about what Mabenn does today" check |
| 5.5 | Draft full articles (EN, 800–1200 words each) | [ME] | Done in batches of 1–2 per week to keep momentum |
| 5.6 | Translate locked EN articles to PT-BR | [ME] | First pass |
| 5.7 | PT-BR engineer native review per article | [YOU/engineer] | Block on this — articles need to read native |
| 5.8 | Build blog infrastructure: `/aprenda/[slug]` route, MDX or DB-backed content, Article schema (JSON-LD), sitemap inclusion, internal linking | [ME] | New Linear issue; runs in parallel to Track 4 |
| 5.9 | Add a waitlist CTA component reusable across articles | [ME] | Per `feedback_revenue_is_the_centerpiece` — frame the CTA around revenue clarity |
| 5.10 | Publish articles 1-by-1 as PT-BR review completes | [YOU] | Cadence: 1 article every 1–2 weeks once started |
| 5.11 | After publication, **request indexing** in Search Console for each article | [YOU] | Speeds up Google noticing them |

---

## Track 6 — On-Page SEO Cleanup (week 2–4)

Smaller fixes that compound once Track 4 + 5 land traffic.

| # | Task | Who | Notes |
|---|---|---|---|
| 6.1 | Fix heading hierarchy on landing page (pillar mechanism chips: `<p>` → `<h3>`) | [ME] | Small PR |
| 6.2 | Regenerate OG image to match the new editorial dark landing page aesthetic | [ME] | Uses `src/app/og-image/` generator |
| 6.3 | Add `Organization` JSON-LD schema in layout | [ME] | Small addition to `layout.tsx` |
| 6.4 | Add `Article` JSON-LD schema to blog template (depends on 5.8) | [ME] | Part of blog infrastructure PR |
| 6.5 | Add `FAQPage` JSON-LD to articles that contain FAQ sections | [ME] | Per article that uses the pattern |
| 6.6 | Audit alt text on all images / decorative SVGs | [ME] | Quick sweep |
| 6.7 | Lighthouse + Core Web Vitals pass — target 95+ on all four pillars | [ME] | After Track 4 lands so I'm measuring the post-routing site |

---

## Track 7 — Trust & Authority Signals (month 2 → month 4)

Backlinks accelerate everything in Tracks 4–6.

| # | Task | Who | Notes |
|---|---|---|---|
| 7.1 | Compile target list: Brazilian fintech publications (Neofeed, Brazil Journal, StartSe, The Brief), small-business outlets | [US] | I research, you vet contacts |
| 7.2 | Draft a press outreach email template (EN, then PT-BR) | [US] | One template per outlet type |
| 7.3 | Send 5–10 personalized cold pitches to Brazilian outlets | [YOU] | Pure cold outreach; expect ~10% reply rate |
| 7.4 | Identify 2–3 podcast appearances (Brazilian small-business / fintech / founder shows) | [YOU] | Founder story + Mabenn angle |
| 7.5 | Plan Product Hunt Brasil launch — schedule for when product is closer to live | [US] | Defer to month 4–6 |
| 7.6 | Identify 5–10 Brazilian small landlords for personal cold DMs / emails | [YOU] | The "your customers are findable on LinkedIn" play |

---

## Track 8 — Paid Acceleration (revisit at end of month 1)

Deferred decision per your input — start organic, then evaluate.

| # | Task | Who | Notes |
|---|---|---|---|
| 8.1 | End of month 1: **review organic signal** — LinkedIn impressions, waitlist signups, GSC trends | [US] | Decision gate |
| 8.2 | If signal warrants it, decide on a paid budget cap and channel mix | [YOU] | You set the cap based on personal-finance comfort |
| 8.3 | If proceeding: draft 3–5 Meta ad creatives in PT-BR around top-performing LinkedIn posts | [US] | The LinkedIn organic winners become the paid ad concepts |
| 8.4 | If proceeding: small Google Ads test on 5–10 long-tail Brazilian terms (NOT head terms — way too competitive) | [US] | Budget cap, kill switch criteria, attribution via UTM |

---

## What I need from you to start

To unblock Track 1 and Track 2 immediately:

1. **Create the LinkedIn company page** (task 1.1) — biggest single unblock
2. **GSC + Bing Webmaster Tools accounts** (1.4, 1.5) — I can prepare verification meta tags as soon as you have accounts
3. **Confirm a posting cadence commitment** (2.2) — 3x/week or whatever you'll actually sustain
4. **Confirm or swap the 5 content pillars** in section 2B
5. **Introduce me to the PT-BR engineer** for review workflow (just confirm who, and how to coordinate) (2.4)

Once those are in place, I'll start drafting the first 6 LinkedIn posts and the routing change PR in parallel.

---

## What I'll do without waiting

I can start these immediately without any blockers on your side:

- Task 1.6 — Lighthouse audit + baseline numbers
- Task 1.7 — PostHog waitlist event verification
- Task 1.9 — UTM conventions doc + helper
- Task 4.2 — Routing strategy trade-off doc (with recommendation)
- Task 5.2 — Cornerstone topic proposal
- Task 6.1 — Heading hierarchy fix on landing page (small PR)
- Task 6.3 — `Organization` JSON-LD schema

Tell me which to start with and I'll go.

---

## Honest expectations for the funding conversation

In a 3–6 month window, the waitlist you can credibly present to Alex comes from:

- **LinkedIn founder content + engagement** — likely your largest single source. Realistic: a few hundred to low thousands of signups if cadence holds and the gringo-in-Brazil angle lands.
- **Community seeding** — adds a long tail of high-intent signups. Realistic: tens to low hundreds.
- **Cornerstone articles** — start contributing in month 4+. Realistic for funding conversation: trickle, not headline.
- **Per-locale URLs + on-page SEO** — invisible to the waitlist number, visible to Alex as "we built the foundation correctly." Worth mentioning as moat-building, not as a current metric.
- **Press / podcasts** — episodic; one good hit can 2x your waitlist for a week. Volatile.

**The story to Alex isn't "we have N signups."** It's "we have N signups *plus* a compound machine built, plus a founder who can ship content + product + community simultaneously while bootstrapped." The waitlist is evidence of execution, not the product.
