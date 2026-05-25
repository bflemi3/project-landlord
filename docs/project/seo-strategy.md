# SEO & Waitlist Growth Strategy

**Date:** 2026-05-24
**Goal:** Build a significant waitlist before product launch. Waitlist size is intended to support a funding conversation with Alex (or his network). SEO is one of several channels — important, but slower than other levers.

This document is the strategic framework for thinking about SEO and waitlist growth for Mabenn's landing page (`/` at mabenn.com / mabenn.com.br). When picking up this work in a fresh session, read this first.

---

## TLDR

**SEO alone will not drive a fundable waitlist in a short window.** Organic SEO compounds over 3–6+ months. To hit a fundraisable waitlist size faster, layer SEO foundation work with:

- **Founder content** (LinkedIn, Brandon posting about Brazilian-landlord pain)
- **Community seeding** (Brazilian Facebook groups, Reddit r/brasil + r/imoveis, WhatsApp)
- **Paid acceleration** (Brazilian Meta + Google Ads, modest budget)
- **SEO foundation** so it compounds for months 3–6

The five-layer SEO framework below is structured top-to-bottom in **leverage-per-effort order**. Start with #1.

---

## The five layers

### 1. Per-locale URL structure — highest-leverage technical fix

**Problem:** Mabenn currently uses cookie-based locale switching (`NEXT_LOCALE` cookie) under a single URL. Google indexes **one page**. The PT-BR version — the primary market — is effectively invisible to Brazilian search.

**Fix:** Switch to URL-prefixed routing via `next-intl`. Each locale gets its own indexable URL:

- `mabenn.com.br/` — Brazilian Portuguese (primary)
- `mabenn.com/` — English fallback
- `mabenn.com/es/` — Spanish

This requires:

- `next-intl` routing strategy change (currently `cookies`, switch to `pathnames` or `domain`)
- Update `i18n/routing.ts` + `i18n/request.ts`
- `hreflang` tags emitted from the layout
- Both domains pointing at the same Vercel deployment, with the domain determining the locale

This is the single biggest technical SEO lever. Without it, no other on-page optimization compounds — Google sees one page in one language.

### 2. Content engine — where the real traffic comes from

A landing page rarely ranks for competitive head terms. Real organic traffic comes from a **blog or content section** targeting long-tail search intent.

**Strategic insight worth highlighting:** Mabenn's planned **AI knowledgebase** (trained on Brazilian rental law + each contract) IS the content engine. Curated answers from the knowledgebase can be published as indexed articles. Each article serves three purposes:

1. SEO landing surface for a long-tail Brazilian search
2. Authority signal (Mabenn understands Brazilian rental law)
3. Pre-product teaser with a waitlist CTA

**Brazilian small-landlord search intents to target:**

| Theme | Sample queries |
|---|---|
| Late payment / eviction | "como notificar inquilino aluguel atrasado", "modelo notificação atraso aluguel", "Lei do Inquilinato despejo" |
| Rent adjustment | "reajuste aluguel IPCA 2026", "como calcular reajuste aluguel", "IPCA acumulado 12 meses" |
| Property management alternatives | "alternativa imobiliária administradora", "vale a pena alugar sem imobiliária", "como administrar aluguel sozinho" |
| Contract management | "modelo contrato aluguel Lei do Inquilinato", "renovação contrato aluguel direitos" |
| Brazilian fintech / payments | "DDA condomínio funcionamento", "Open Finance aluguel", "Pix recebimento aluguel" |
| Tax / Receita Federal | "declaração IR aluguel recebido", "imposto renda renda aluguel" |

**Initial content lifecycle to design:**

- AI knowledgebase produces a verified answer to a question
- Answer gets curated + expanded into a 600–1200 word article in PT-BR
- Article published at `mabenn.com.br/blog/[slug]` (or `/aprenda/`, `/recursos/`)
- Each article links back to a topic pillar page (e.g., "Guia Completo: Reajuste de Aluguel")
- Articles internally link to each other
- Sitemap auto-updates
- Every article has a clear waitlist CTA

Start with **5 cornerstone articles** covering the top searched questions. Build out clusters around them.

### 3. On-page SEO audit

Once per-locale URLs exist (layer 1), audit each indexable page:

- **H1 hierarchy** — currently the hero headline is split into three `<span>` blocks; Google reads the whole `<h1>` as one string, which works. Pillar headlines should be H2. Mechanism chip titles should be H3 (currently `<p>`, change to `<h3>` for proper hierarchy).
- **Meta title / description per locale** — currently set globally in `layout.tsx`. Each locale needs its own. Title ≤60 chars, description ≤155 chars for Google's display limits.
- **Schema markup** — currently `SoftwareApplication` JSON-LD on `/`. Add:
  - `FAQPage` on articles
  - `Organization` for the company
  - `BreadcrumbList` once we have multi-level navigation
  - `Article` schema on blog posts (author, datePublished, dateModified)
- **Alt text** — verify every `<img>` and meaningful `<svg>` has alt or `aria-label`. Most mockups currently use `aria-hidden` because they're decorative; that's correct.
- **Canonical URLs** — ensure each locale page declares itself canonical and points to the other locales via `<link rel="alternate" hreflang="..." />`.
- **Internal linking** — once a blog exists, every article links to relevant pillar pages + waitlist.
- **Keyword usage** — current landing copy already includes "Brazilian landlords", "rental management", "rent tracking", "IPCA", "Lei do Inquilinato", "boletos", "condomínio". Good baseline. Avoid stuffing.

### 4. Off-page — discovery & authority

Pre-launch, this is what drives signups *now*:

- **Founder LinkedIn content** — Brandon posting consistently (1/day or 3/week) about small-landlord pain in Brazil, IPCA stories, late-payment stories, the philosophy behind Mabenn. Fastest authority signal. Brazil's LinkedIn small-business community is active.
- **Brazilian Facebook / WhatsApp groups for landlords** — *Proprietários de Imóveis*, *Locação SP*, etc. Organic posts (not spam). Direct, helpful presence builds trust.
- **Reddit / forums** — r/brasil, r/imoveis, r/empreendedorismo (Brazilian). Lower volume but high credibility when authentic.
- **Product Hunt Brasil launch** — when the product is closer to ready.
- **Press outreach** — Brazilian fintech publications (Neofeed, Brazil Journal, StartSe, The Brief), small-business outlets.
- **Cold outreach** — curated list of small landlords (LinkedIn search, real estate forum members). Personal email, not blast.

Backlinks earned from off-page motion feed back into Google's domain authority signal, accelerating layer 2 + 3.

### 5. Measurement — required before optimizing

Without measurement, optimization is guessing. Set up:

- **Google Search Console** — indexed pages, search queries ranking, click-through rate, impressions per query.
- **Bing Webmaster Tools** — small but free additional surface.
- **PostHog** (already integrated) — track conversion rate from each traffic source.
- **UTM tagging** — every external share / post tagged so PostHog can attribute waitlist signups to specific channels.
- **Keyword tracking** — semrush / ahrefs / ubersuggest. Free tier is fine to start.

Build a simple dashboard tracking weekly: organic sessions per locale, top 20 ranking keywords, CTR, waitlist signups per channel.

---

## Reality check — why SEO alone won't hit funding milestone

A new domain ranks slowly. Brazilian SEO competition for property-management queries includes existing imobiliárias and aggregators with years of authority. Honest expectations:

- **Month 1–3**: technical foundation, first content articles indexed. Organic traffic still negligible.
- **Month 3–6**: long-tail articles start ranking on page 2–3. First trickle of organic signups (10s/month).
- **Month 6–12**: pillar articles climb to page 1 for moderate-competition queries. Compound growth.
- **Month 12+**: head terms start ranking with sustained content + backlinks.

For a funding pitch in <6 months, organic SEO is a long-term moat being built in parallel — not the headline metric. The waitlist number that matters for fundraising will come from:

- Founder content + community seeding (months 1–3)
- Paid acceleration (if budget allows; months 1–3)
- SEO compounding starts contributing meaningfully around month 4+

---

## Specific landing-page SEO recommendations (current state)

### What already exists

- `src/app/layout.tsx` — metadata defined globally. Title, description, OG, Twitter, JSON-LD link tag, hreflang language alternates (but pointing at the same domain — not yet per-locale URLs).
- `src/app/(public)/page.tsx` — JSON-LD `SoftwareApplication` schema.
- `src/app/sitemap.ts` + `src/app/robots.ts` — exist, but need auditing for locale variants.
- `messages/{en,pt-BR,es}.json` — fully translated landing copy.

### What needs to change

1. **Per-locale URL structure** (layer 1 above)
2. **Sitemap.ts** updated to emit entries for each locale URL with `alternates` cross-references
3. **Per-locale metadata** — title/description should differ per locale, not just one English version
4. **Schema markup expansion** — add `Organization` + `FAQPage` (latter once we have FAQs)
5. **Heading hierarchy audit** — pillar mechanism chips currently use `<p>` with uppercase styling; should be `<h3>` for SEO
6. **OG image** — currently still the pre-pivot version. Generate a new one matching the editorial dark aesthetic with the new headline
7. **Performance audit** — run Lighthouse, verify Core Web Vitals targets

### Where things live (for future sessions)

- Landing page: `src/app/(public)/page.tsx`, `src/app/(public)/landing.tsx`
- Metadata: `src/app/layout.tsx`
- Locale files: `messages/en.json`, `messages/pt-BR.json`, `messages/es.json`
- i18n routing: `src/i18n/routing.ts`, `src/i18n/request.ts`
- Sitemap: `src/app/sitemap.ts`
- Robots: `src/app/robots.ts`
- OG image generator: `src/app/og-image/`
- Analytics: PostHog already integrated; check `posthog.capture('waitlist_joined')` event flows

---

## What to do FIRST when picking this up

In order:

1. **Audit current state** — run Lighthouse against the deployed page. Use Google Rich Results Test + Twitter Card Validator + Meta Sharing Debugger. Note current scores and any errors.
2. **Set up Google Search Console + Bing Webmaster Tools** — no point optimizing without measurement.
3. **Verify sitemap and robots emit correctly** — view `/sitemap.xml` and `/robots.txt` on deployed page.
4. **Plan per-locale URL structure** — read next-intl docs for routing strategies. Decide between `pathnames` (single domain with prefixes like `/pt-br`) and `domain` (per-locale TLD). The user owns both `mabenn.com` and `mabenn.com.br`, so `domain` strategy is viable and preferable for PT-BR SEO.
5. **Implement per-locale URLs** — biggest single technical change. This will require routing config + middleware updates + sitemap regeneration. Do this in its own branch + PR — it touches the routing layer.
6. **Plan the first 5 content articles** — pick the highest-intent Brazilian queries from the table above. Draft titles, target keywords, and outline. The articles themselves can be drafted from the AI knowledgebase content (when it exists) or written manually.

---

## Open questions / decisions

- **Domain strategy**: confirm `mabenn.com.br` is purchased and ready to point at the same Vercel deployment. (Per memory, both `.com` and `.com.br` are planned purchases.)
- **Blog vs section structure**: where does blog content live? `mabenn.com.br/blog/[slug]` vs `mabenn.com.br/aprenda/[slug]` vs `mabenn.com.br/recursos/[slug]`. PT-BR convention leans toward `aprenda` or `recursos`. Decide before publishing.
- **AI knowledgebase content rights**: when AI generates an answer for a user, can that answer (suitably edited) be published as an article? Need a content workflow: user question → AI answer → curation review → publish.
- **Paid budget**: what monthly amount, if any, is available for Meta + Google Ads? Affects whether organic-only is the strategy or hybrid.
- **Founder content cadence**: who's authoring LinkedIn posts and at what frequency? Brandon needs to commit to a schedule.

---

## Related project memory

- `project_domains.md` — both `.com` and `.com.br` are planned purchases
- `feedback_linear_stories.md` — Linear issues written primarily for Claude Code consumption
- The landing page redesign spec at `docs/superpowers/specs/2026-05-22-landing-page-pivot-redesign-design.md` captures the full product positioning and is the source of truth for the page's content/tone
- The product pivot doc at `docs/project/product-pivot-long-term-rentals.md` is the strategic positioning the SEO should reinforce

---

## Summary

SEO is the long-term compound machine. Founder content + community seeding + paid is the short-term waitlist growth engine. The two work together — but they require different time horizons.

For Mabenn's funding window, **invest in SEO foundations now** (per-locale URLs, first 5 cornerstone articles, measurement setup) **while running the faster channels** in parallel. The SEO investment compounds. The faster channels generate the waitlist that supports the funding conversation.

The order to think about it:

1. **Measurement first** (Search Console, Webmaster Tools, UTMs)
2. **Per-locale URLs** (one-time technical change with huge impact)
3. **Content engine** (cornerstone articles, AI knowledgebase as factory)
4. **On-page audit** (heading hierarchy, schema, OG image, performance)
5. **Off-page motion** (founder content, community, press, paid) — in parallel with everything above
