# Code review fixes — legal pages + composable MarkdownDocument

**Branch:** `brandon/legal-pages-composable-markdown`
**Review date:** 2026-05-28
**Scope reviewed:** `main..HEAD` + all working-tree changes at the time of review.

This document is the handoff for a fresh session to fix the issues surfaced by a high-recall code review. The review found **15 confirmed/plausible findings** out of ~22 deduped candidates from 5 finder angles + a sweep + a verifier pass.

---

## Where the work lives

### Committed on the branch (3 commits)
1. `d7fc431` — `chore: Mabenn casing in CHANGELOG and READMEs`
2. `43db595` — `Add /privacidade + /termos with shared composable MarkdownDocument`
3. (A third commit from a subagent — soft-reset, **its content is in the working tree now** as staged + unstaged changes.)

### Uncommitted (staged + working tree) — the bulk of what was reviewed
- **Localized pathnames per host:** `/privacy` + `/terms` on `mabenn.com`, `/privacidade` + `/termos` on `mabenn.com.br`. ES users (cookie-only) fall back to the `.com` domain with English URLs and Spanish content.
- **New module:** `src/lib/i18n/localized-paths.ts` — single source of truth: `LOCALIZED_PATHS` data + `localizedPath(locale, key)` accessor + `localizedRewrites()` + `localizedRedirects()` generators consumed by `next.config.ts`.
- **`next.config.ts`** uses those generators (no more literal rewrites/redirects); `outputFileTracingIncludes` keys are `/privacy` and `/terms` (folder names, post-rewrite).
- **`marketing-meta.ts`** no longer owns `LEGAL_PATHS`/`legalPath`/`LegalDoc` — they moved to `localized-paths.ts`. `MarketingLocale` is now defined in `localized-paths.ts` and re-exported from `marketing-meta.ts`.
- **Folder renames:** `src/app/(public)/privacidade/` → `privacy/`, `termos/` → `terms/`. Page files updated.
- **`BackButton`** (`src/components/back-button.tsx`): gained `label?`/`href?`/`onClick?` props. When `href` is set, renders as a Link via Base UI's `render={<Link/>}` prop with `variant="link"`. Otherwise `variant="ghost"` + `router.back()` handler. **Includes a workaround** for a Next App Router popstate-with-hash bug.
- **`<html data-scroll-behavior="smooth">`** added in root layout (Next's documented attribute — see `https://nextjs.org/docs/messages/missing-data-scroll-behavior`).
- **Markdown content fixes:** `src/content/legal/terms/en.md` and `terms/es.md` updated their inline `/privacidade` references to `/privacy` (since they render on `.com` where the EN folder is canonical). `pt-BR.md` keeps `/privacidade`.

---

## How to use this doc

1. Skim **Findings** once. Each is numbered + severity-tagged. They are ranked most-severe first.
2. Work in the **Suggested order** (below) or pick a category. Each finding has a concrete recommended fix.
3. **Decisions to surface** lists open questions — flag these back to the user; don't guess.
4. **PLAUSIBLE** findings need a verification step before fixing — don't fix blind.

## Conventions to follow

- **Default to NO code comments.** Comments only for non-obvious *why*. (CLAUDE.md)
- Brand prose: **Mabenn** sentence-case in prose; **mabenn** lowercase only for the wordmark.
- pt-BR / es copy added in this branch is AI-drafted, pending native-speaker review.
- The custom `src/middleware.ts` (Supabase session + locale cookie seeding + Accept-Language redirect) is load-bearing — **do not replace it with next-intl middleware**.
- Domain-driven locale: `mabenn.com` → en, `mabenn.com.br` → pt-BR, cookie overrides.

## Suggested order

1. **#1** — BackButton over-firing workaround (every back-nav corrupts history; highest impact).
2. **#2** — PT-BR markdown link 404 on `.com` (broken link in a legal doc).
3. **#3** — `/privacidade` + `/termos` 404 on localhost / Vercel preview / staging (every dev/QA broken).
4. **#8** (PLAUSIBLE) — verify `outputFileTracingIncludes` before merge; if broken, prod 500.
5. **#4** — JSON-LD host-hardcoding (SEO).
6. **#5** — Markdown `a` wrapper misroutes `#anchor` / `mailto:` / `tel:` / protocol-relative.
7. **#6** — Changelog localization regression.
8. The rest, in order.

---

## Findings

### 1. 🚨 BackButton workaround over-fires every back navigation

**Where:** `src/components/back-button.tsx:29`
**Severity:** Critical — every back-nav duplicates history.
**Verdict:** CONFIRMED.

The `setTimeout` after `router.back()` was added to work around a real Next App Router bug: `router.back()` to a URL with a hash (where the path also changed, e.g. `/privacy → /#faq`) fires popstate but doesn't trigger a route transition. The current predicate:

```ts
if (window.location.pathname !== beforePath) {
  router.push(window.location.pathname + window.location.search + window.location.hash)
}
```

…is true for **every** successful cross-page back, not just the hash case it was meant for. Result: history goes `[/, /privacy]` → click back → router.back lands at `/` → setTimeout pushes `/` → history becomes `[/, /]`. Forward stack destroyed; double-back stuck.

**Recommended fix:** narrow the predicate so it only fires when Next actually missed the route change. Use `usePathname()` (Next's internal pathname) via a ref so the timeout closure can compare it to the browser path:

```ts
function BackButton({ label, href, onClick }: BackButtonProps) {
  const router = useRouter()
  const t = useTranslations('common')
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  function handleClick() {
    const beforePath = window.location.pathname
    if (window.history.length > 1) {
      router.back()
      const timer = setTimeout(() => {
        // Only force a push when the browser path changed but Next's router
        // didn't process it (the popstate-with-hash bug).
        if (window.location.pathname !== beforePath && pathnameRef.current === beforePath) {
          router.push(window.location.pathname + window.location.search + window.location.hash)
        }
      }, 100)
      return () => clearTimeout(timer)  // see #13
    } else {
      router.push('/')
    }
  }
  // ...
}
```

**Cleaner alternative:** drop `router.back()` entirely. Capture `document.referrer` once on mount; if same-origin, push that URL on click. No popstate to fight.

**Verify:**
- Repro the original FAQ-hash flow: landing → click FAQ nav (`/#faq`) → footer privacy link → BackButton. URL = `/#faq`, content = landing, scrolled to FAQ section.
- Normal back (no hash): landing → footer privacy → BackButton. Check that `window.history.length` did not get incremented during the back. Forward button should still work.

---

### 2. 🚨 PT-BR terms markdown link `/privacidade` 404s on `mabenn.com`

**Where:** `src/content/legal/terms/pt-BR.md:13` (also 64, 98, 118)
**Severity:** High — broken link in a legal doc, easy to hit.
**Verdict:** CONFIRMED.

A user with `NEXT_LOCALE=pt-BR` cookie on `mabenn.com` is served PT-BR content because `src/i18n/request.ts` lets cookie beat host. The markdown's `[Política de Privacidade](/privacidade)` link sends them to `mabenn.com/privacidade` — **no folder there** (it was renamed to `/privacy` in this branch) and **the rewrite is host-gated** to `.com.br` only. 404.

**Recommended fix:** Two reasonable approaches:

**(a)** Replace `/privacidade` → `/privacy` in `pt-BR.md`. On `.com.br`, the `localizedRedirects()` 308 sends `/privacy` → `/privacidade`. On `.com`, it serves directly. The link works on both. Trade-off: the URL the *content* references is the English one, which reads a bit odd in a Portuguese doc.

**(b)** Render markdown through a remark plugin (or pre-render substitution) that replaces a placeholder like `{{privacyHref}}` with `localizedPath(locale, 'privacy')` at render time. Cleaner separation; more code.

Recommended: **(a)** for now. It's one line per doc and the redirect handles it.

**Verify:** `curl -H "Host: mabenn.com" http://localhost:3000/terms` (with NEXT_LOCALE=pt-BR cookie if testing in browser) — the rendered HTML's `<a href>` should not be `/privacidade`.

---

### 3. 🚨 `/privacidade` + `/termos` 404 on every host except `mabenn.com.br`

**Where:** `next.config.ts:39` (`localizedRewrites()` host-gated to `PT_BR_HOST`)
**Severity:** High — every developer's dev session, every Vercel preview, every staging host can't load the canonical pt-BR URLs.
**Verdict:** CONFIRMED.

The folder rename (`privacidade` → `privacy`) deleted the `/privacidade` route. The new rewrite restores it via `has: [{ type: 'host', value: '(?:www\\.)?mabenn\\.com\\.br' }]` — but that only matches production. On localhost / `*.vercel.app` preview / staging, neither the folder nor the rewrite exists.

**Failure scenarios:**
- `pnpm dev` + NEXT_LOCALE=pt-BR cookie → footer Privacy link goes to `/privacidade` → 404.
- Vercel preview `mabenn-git-<branch>.vercel.app/privacidade` → 404. Reviewers can never see the canonical PT-BR URL.
- Any QA on a non-prod host.

**Recommended fix:** broaden the host match to also fire on preview hosts. Options:

**(a)** Add `localhost` and `*.vercel.app` to the host regex:
```ts
const PT_BR_HOST = '(?:www\\.)?mabenn\\.com\\.br|localhost(:\\d+)?|.*\\.vercel\\.app'
```
This means previews ALWAYS serve at the pt-BR URL — fine, since previews are single-locale dev artifacts. Drawback: previews lose the ability to test EN URLs.

**(b)** Keep the production-only gating but ALSO expose `/privacidade`/`/termos` directly as folders on `(public)/` (redirect or re-export from `/privacy`). More work.

**(c)** Best: gate the rewrite on `NODE_ENV !== 'production' || host=PT_BR`. In non-prod, serve both URL variants directly (the folders are at `/privacy`, so add a duplicate route via a Next.js `rewrites()` rule that's NODE_ENV-aware).

Recommend **(a)** — simplest, narrowly broader.

**Verify:** on localhost, `curl http://localhost:3000/privacidade` and `/termos` both return 200. On a preview deployment, same.

---

### 4. 🚨 JSON-LD hardcodes `https://mabenn.com` on every host

**Where:** `src/app/(public)/page.tsx:36` (and related entries throughout the `jsonLd` object)
**Severity:** High — SEO/structured-data inconsistency on `.com.br`.
**Verdict:** CONFIRMED (sweep finding).

The JSON-LD `Organization` (`@id`, `url`, `logo`) and `SoftwareApplication` (`url`, `publisher`) all hardcode `https://mabenn.com`. On `mabenn.com.br` the page's canonical is `https://mabenn.com.br` but the structured data declares the site as `.com`. Crawlers see inconsistent entity attribution for the pt-BR market.

**Recommended fix:** compute the JSON-LD per-host using the resolved `origin`:

```ts
const origin = MARKETING_ORIGIN[locale]  // already computed
const orgId = `${origin}/#organization`
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': orgId,
      url: origin,
      logo: `${origin}/icons/icon-512.png`,
      // ...
    },
    {
      '@type': 'SoftwareApplication',
      // ...
      url: origin,
      publisher: { '@id': orgId },
    },
    // ...
  ],
}
```

**Verify:** `curl -H "Host: mabenn.com.br" http://localhost:3000/ | grep -o 'application/ld+json' -A 5` — every URL inside the JSON-LD on `.com.br` should be `https://mabenn.com.br`.

---

### 5. 🚨 Markdown `a` wrapper misroutes `#anchor`, `mailto:`, `tel:`, protocol-relative

**Where:** `src/components/markdown-document.tsx:34`
**Severity:** High (correctness + minor security).
**Verdict:** CONFIRMED.

```ts
a: ({ href, ...props }) => {
  // ...
  return href?.startsWith('/') ? (
    <Link href={href} ... />
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" ... />
  )
}
```

- `href="//example.com"` (protocol-relative) **passes** `startsWith('/')` → handed to `<Link>` → potentially navigates cross-origin via next/link without target/rel safety.
- `href="#anchor"` **fails** → renders as `<a target="_blank">`, opening the in-document anchor in a new tab.
- `href="mailto:foo@bar"` / `tel:+5511…` **fail** → external branch, opens a blank tab before the protocol handler fires.

**Recommended fix:** branch more carefully:

```ts
a: ({ href, ...props }) => {
  const className = '...'
  const cleaned = omitNode(props)
  if (!href) return <a {...cleaned} className={className} />
  if (href.startsWith('#')) return <a href={href} {...cleaned} className={className} />
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link href={href} {...cleaned} className={className} />
  }
  // External (http(s), mailto:, tel:, //protocol-relative, etc.)
  const external = /^(https?:|\/\/)/.test(href)
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...cleaned}
      className={className}
    />
  )
}
```

**Verify:** add a markdown snippet with each of `[a](#section)`, `[b](mailto:test@test)`, `[c](tel:+1)`, `[d](//example.com)`, `[e](/privacy)`, `[f](https://example.com)` to a test legal doc and check the rendered HTML.

---

### 6. 🌐 Changelog metadata + chrome hardcoded English

**Where:** `src/app/(public)/changelog/page.tsx:10` + the `<MarkdownDocumentHeader title="What's new" subtitle="…" />` inside the same file.
**Severity:** High — visible regression on the pt-BR domain.
**Verdict:** CONFIRMED.

```ts
export const metadata = { title: "What's new" }
// ...
<MarkdownDocumentHeader title="What's new" subtitle="See what we've been working on to make Mabenn better for you." />
```

Both the SEO title and the rendered chrome are English-only. Privacy/Terms use `getTranslations` in `generateMetadata`; this page regresses the pattern on `mabenn.com.br`.

**Recommended fix:**
1. Add a `changelog` namespace to `messages/{en,pt-BR,es}.json` with `title` + `subtitle`.
2. Convert the page to use `getTranslations` (like privacy/terms):

```ts
// At top of file:
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('changelog')
  return { title: t('title') }
}

export default async function ChangelogPage() {
  const t = await getTranslations('changelog')
  const content = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
  return (
    <MarkdownDocument>
      <BackButton />
      <MarkdownDocumentHeader title={t('title')} subtitle={t('subtitle')} />
      <MarkdownDocumentContent hideH1>{content}</MarkdownDocumentContent>
    </MarkdownDocument>
  )
}
```

3. Translations (AI drafts pending native review):
   - en: `title: "What's new"`, `subtitle: "See what we've been working on to make Mabenn better for you."`
   - pt-BR: `title: "Novidades"`, `subtitle: "Veja no que estamos trabalhando para deixar o Mabenn melhor para você."`
   - es: `title: "Novedades"`, `subtitle: "Mira en qué estamos trabajando para mejorar Mabenn para ti."`

**Verify:** curl with each host (`mabenn.com` and `mabenn.com.br`) and check the `<title>` tag and the rendered h1/subtitle.

---

### 7. 🌐 Page body locale ≠ metadata locale

**Where:** `src/app/(public)/privacy/page.tsx:39` and `terms/page.tsx:39`
**Severity:** High — SEO fragmentation; Spanish content under PT-BR canonical.
**Verdict:** CONFIRMED.

```ts
// Body uses getLocale() (cookie-driven, can be 'es'):
const requested = await getLocale()
const locale: Locale = (locales as readonly string[]).includes(requested) ? (requested as Locale) : defaultLocale

// Metadata uses marketingLocaleFromHost(host) (host-only, en|pt-BR):
const host = (await headers()).get('host')
const locale = marketingLocaleFromHost(host)  // 'en' | 'pt-BR' only
```

A user on `mabenn.com.br` with `NEXT_LOCALE=es` cookie gets Spanish markdown body but PT-BR `<title>` + canonical + hreflang (no ES alternate). Google sees Spanish content under a PT-BR canonical with no ES hreflang.

**Recommended fix:** decide which side rules — either:

**(a) Body follows metadata (host-only).** Drop cookie-driven locale on legal pages; serve the host's language. Simplest, makes URLs and content fully aligned. ES users on `.com` get EN content (cookie override loses for these pages).

**(b) Metadata follows body (cookie-driven).** Use `getLocale()` in `generateMetadata` too. But `MarketingLocale` only allows `en|pt-BR`, and our origins map only has those two. Adding ES to `MARKETING_ORIGIN`/`MarketingLocale` opens questions about which domain serves ES.

Recommend **(a)** — the simplest, and consistent with the "URL = language" premise behind `localizedPath`. If ES on `.com.br` is desired, it should be a redirect to `.com` (where ES is served).

**Decision needed:** which side wins? Ask the user before fixing.

---

### 8. ⚠️ PLAUSIBLE: `outputFileTracingIncludes` keys may break prod on `.com.br`

**Where:** `next.config.ts:33`
**Severity:** Possibly critical (prod 500), but contingent on Next semantics.
**Verdict:** PLAUSIBLE.

```ts
outputFileTracingIncludes: {
  '/privacy': ['./src/content/legal/privacy/**/*'],
  '/terms': ['./src/content/legal/terms/**/*'],
}
```

The keys are folder names (post-rewrite). On `.com.br`, the *incoming* request is `/privacidade`, then internally rewritten to `/privacy`. **Next docs are ambiguous** about whether the trace-includes key matches the incoming path or the internal route. If it matches the incoming path, the markdown files won't be bundled into the `.com.br` request's serverless function — `fs.readFileSync` throws ENOENT, page 500s.

**Recommended verification (before fixing):**
1. Run `pnpm build`.
2. Inspect `.next/server/app/privacy.*` (or the per-route trace file). Confirm `src/content/legal/privacy/**/*.md` is in the function's bundled files.
3. If the trace includes the files: this finding is REFUTED. Add a code comment to that effect.
4. If the trace does NOT include the files on the .com.br route: add the `/privacidade` and `/termos` keys defensively:
   ```ts
   outputFileTracingIncludes: {
     '/privacy': ['./src/content/legal/privacy/**/*'],
     '/privacidade': ['./src/content/legal/privacy/**/*'],  // same content, different incoming path on .com.br
     '/terms': ['./src/content/legal/terms/**/*'],
     '/termos': ['./src/content/legal/terms/**/*'],
   }
   ```

**Do not deploy without verifying.**

---

### 9. 🌐 Middleware redirect chains with localizedRedirects on pt-BR browsers

**Where:** `src/middleware.ts:26` (chains with `localizedRedirects()` from `src/lib/i18n/localized-paths.ts:30`)
**Severity:** Medium — perf + SEO concern.
**Verdict:** CONFIRMED (sweep finding).

A pt-BR browser visiting `mabenn.com/privacy` with no locale cookie:
1. Middleware Accept-Language redirect → `307 → https://mabenn.com.br/privacy`.
2. On `.com.br`, `localizedRedirects()` 308 → `/privacidade`.

Two sequential redirects per navigation. Extra TTFB, extra Vercel function invocations, and Google deprioritizes chained redirects in indexing.

**Recommended fix:** in `src/middleware.ts`, when the Accept-Language redirect fires, translate the path to its `.com.br` localized equivalent before redirecting — so the redirect lands on the canonical pt-BR URL directly.

```ts
// In middleware, before the redirect:
import { localizedPath } from '@/lib/i18n/localized-paths'

// ... after determining we redirect to .com.br:
const incomingPath = request.nextUrl.pathname
const ptBrPath = mapIncomingPathToPtBr(incomingPath)  // /privacy -> /privacidade, /terms -> /termos, else passthrough
const target = new URL(ptBrPath + request.nextUrl.search, 'https://mabenn.com.br')
return NextResponse.redirect(target, 307)
```

The `mapIncomingPathToPtBr` helper can live in `localized-paths.ts` next to `localizedPath`:
```ts
const PATH_EN_TO_PT_BR: Record<string, string> = Object.fromEntries(
  Object.values(LOCALIZED_PATHS).map((p) => [p.en, p['pt-BR']])
)
export function ptBrPathFor(path: string): string {
  return PATH_EN_TO_PT_BR[path] ?? path
}
```

**Verify:** `curl -I -H "Host: mabenn.com" -H "Accept-Language: pt-BR" http://localhost:3000/privacy` — should be a single 307 to `https://mabenn.com.br/privacidade`, not a chain.

---

### 10. 🎨 `hideH1` strips ALL h1s in the markdown, not just the leading one

**Where:** `src/components/markdown-document.tsx:58`
**Severity:** Medium — latent footgun.
**Verdict:** CONFIRMED.

```ts
const componentsNoH1: Components = { ...components, h1: () => null }
```

`react-markdown` calls the `h1` component for every `#` heading. `CHANGELOG.md` has only one today, so it's latent — but a future doc (multi-part legal terms, per-year changelog blocks) silently loses every heading.

**Recommended fix:** suppress only the first h1 via a remark plugin, or rename the prop to `hideAllH1` to match behavior. Simplest fix is a small remark plugin:

```ts
// In markdown-document.tsx (or its own file):
import { visit } from 'unist-util-visit'

function removeFirstH1() {
  return (tree: any) => {
    let removed = false
    visit(tree, 'heading', (node, index, parent) => {
      if (!removed && node.depth === 1 && parent && index != null) {
        parent.children.splice(index, 1)
        removed = true
        return ['skip', index]
      }
    })
  }
}
// Then in <Markdown remarkPlugins={hideH1 ? [removeFirstH1] : []} components={components}>
```

This needs `unist-util-visit` (probably already transitively present via react-markdown's stack). Check `pnpm why unist-util-visit` before adding the dep.

**Verify:** add a temporary 2nd `#` heading to a legal markdown doc, render the page, confirm the second h1 still appears.

---

### 11. 🎨 `<li>` `list-disc` overrides parent `<ol>`'s `list-decimal`

**Where:** `src/components/markdown-document.tsx:31`
**Severity:** Medium — latent footgun (no ordered lists in content yet).
**Verdict:** CONFIRMED (sweep finding).

```ts
li: (props) => (
  <li className="list-disc text-[15.5px] leading-[1.65] text-[#a8a29e] marker:text-[#78716c]" {...omitNode(props)} />
),
ol: (props) => <ol className="mt-5 list-decimal space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />,
```

The `<li>`'s `list-disc` sets `list-style-type: disc` directly on the element, overriding the parent `<ol>`'s `list-decimal` via CSS specificity. Any `1. …` markdown list renders with disc bullets.

**Recommended fix:** move `list-disc` from `<li>` to `<ul>`, so `<ol>` and `<ul>` each set their own style and `<li>` inherits:

```ts
ul: (props) => <ul className="mt-5 list-disc space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />,
ol: (props) => <ol className="mt-5 list-decimal space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />,
li: (props) => (
  <li className="text-[15.5px] leading-[1.65] text-[#a8a29e] marker:text-[#78716c]" {...omitNode(props)} />
),
```

**Verify:** add a `1. one\n2. two` to a legal markdown doc and render; should show `1.` and `2.` not bullets.

---

### 12. 🌐 Sitemap excludes ES from hreflang

**Where:** `src/app/sitemap.ts:9`
**Severity:** Medium — SEO miss for Spanish discovery.
**Verdict:** CONFIRMED.

The `legalLanguages` and `symmetricLanguages` helpers only emit `{en, 'pt-BR'}` alternates. ES content exists (`messages/es.json`, `src/content/legal/{privacy,terms}/es.md`) but Google never gets a hreflang pointing to it.

**Recommended fix:** **Decision needed first.** Is ES intended to be publicly indexed?

- **If yes:** ES needs a stable URL. Today it's only served on `mabenn.com` via cookie — not addressable. Either:
  - Add an `/es` path prefix and add ES to `MARKETING_ORIGIN` + `LOCALIZED_PATHS` + `MarketingLocale`. Then sitemap can emit an ES hreflang.
  - Or: drop the publicly-indexed ES claim and document that ES is cookie-only / not indexed.
- **If no:** add a code comment in sitemap.ts explaining why ES is intentionally excluded.

Ask the user before fixing.

---

### 13. 🐛 `setTimeout` in BackButton has no unmount cleanup

**Where:** `src/components/back-button.tsx:33`
**Severity:** Medium — fires after unmount in dev (warns), races in prod.
**Verdict:** CONFIRMED.

The `setTimeout(..., 100)` is created inside `handleClick` (not an effect) and has no `clearTimeout` cleanup. If BackButton unmounts during the back transition (which is the *common* case — the page is changing), the timer still fires and calls `router.push` on a stale closure.

**Recommended fix:** track the latest timer in a ref + cleanup on unmount:

```ts
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

function handleClick() {
  // ...
  router.back()
  if (timerRef.current) clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => {
    // ... predicate check from #1 ...
  }, 100)
}
```

This pairs with the fix for #1.

**Verify:** add a console.log in the setTimeout callback. Click BackButton, navigate to a new page. The log should NOT fire after navigation.

---

### 14. 🐛 Silent locale fallback for future locales without a `.md`

**Where:** `src/app/(public)/privacy/page.tsx:41` (same pattern in `terms/page.tsx`)
**Severity:** Medium — latent, only bites when a new locale is added without content.
**Verdict:** CONFIRMED.

```ts
const filePath = fs.existsSync(candidate) ? candidate : path.join(dir, `${defaultLocale}.md`)
```

`locales.includes(requested)` accepts any registered locale; the readPolicy fallback silently serves `en.md` if the locale's file is missing. Future locale (e.g. `fr`) added to `src/i18n/routing.ts` without an `fr.md` ships English content under a French canonical with zero warning.

**Recommended fix:** log a warning when falling back. In dev, throw — caught by the build. In prod, log + serve fallback:

```ts
function readPolicy(locale: Locale): string {
  const dir = path.join(process.cwd(), 'src/content/legal/privacy') 
  const candidate = path.join(dir, `${locale}.md`)
  if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf-8')
  const msg = `Missing legal/privacy markdown for locale "${locale}", falling back to ${defaultLocale}.`
  if (process.env.NODE_ENV === 'production') console.error(msg)
  else throw new Error(msg)
  return fs.readFileSync(path.join(dir, `${defaultLocale}.md`), 'utf-8')
}
```

**Verify:** rename `pt-BR.md` to `pt-BR.md.bak` temporarily and load `mabenn.com.br/privacidade` — should throw in dev / log in prod.

---

### 15. 🐛 `window.history.length > 1` includes external referrers

**Where:** `src/components/back-button.tsx:23`
**Severity:** Medium — real UX bug for inbound referral traffic.
**Verdict:** CONFIRMED.

A user clicks a Mabenn `/privacy` link from a Google search result. `window.history.length` is ≥ 2 (search + privacy). BackButton calls `router.back()` → sends them back to Google. The fallback `router.push('/')` only runs when `length === 1` (brand-new tab), which isn't true for any referral entry.

**Recommended fix:** capture `document.referrer` at mount and check if it's same-origin:

```ts
'use client'
import { useEffect, useState } from 'react'

export function BackButton(...) {
  const [hasInternalReferrer, setHasInternalReferrer] = useState(false)
  useEffect(() => {
    try {
      const ref = document.referrer
      setHasInternalReferrer(!!ref && new URL(ref).origin === window.location.origin)
    } catch { /* opaque referrer */ }
  }, [])

  function handleClick() {
    if (hasInternalReferrer) {
      router.back()
      // ... timer logic from #1 / #13 ...
    } else {
      router.push('/')
    }
  }
  // ...
}
```

**Verify:** open `localhost:3000/privacy` directly (no referrer) → BackButton goes to `/`. Open it via a link from another tab → BackButton goes back to that tab's URL... wait, that's a separate tab; opener.tab navigation isn't crossing. Test instead by typing the URL into the bar then clicking BackButton — should go to `/`, not exit.

---

## Decisions to surface to the user

1. **#7 — locale priority on legal pages.** Should the body follow the host (drop cookie override on legal pages) or the cookie (and expand `MarketingLocale` to include ES)?
2. **#12 — ES sitemap inclusion.** Is ES content meant to be publicly indexed? If yes, ES needs a stable URL (path-prefixed or domain-bound). If no, document the exclusion.
3. **#3 — preview-host behavior.** Acceptable to serve `/privacidade` + `/termos` on localhost + preview without per-host branching, or do we want previews to mirror prod exactly?
4. **#8 — verify `outputFileTracingIncludes` before merge.** Run `pnpm build` and inspect the trace file. Don't deploy without verifying.

## Verification checklist (pre-merge)

- [ ] `pnpm exec tsc --noEmit` — clean
- [ ] `pnpm exec eslint <touched files>` — clean
- [ ] `pnpm build` — passes
- [ ] Inspect `.next/server/app/privacy.*` for markdown tracing (#8)
- [ ] Curl smoke test: 4 pages × 2 hosts = 8 200s; redirect/rewrite chain (#9) shows single redirect, not double
- [ ] Browser smoke test: FAQ → privacy → BackButton lands at `/#faq` with content + scroll updated (#1)
- [ ] Open `/privacy` directly (no referrer) → BackButton goes to `/` (#15)
- [ ] Add `2.` to a legal doc and confirm ordered list renders as numbers (#11)
- [ ] Test all 4 URLs on a preview deployment (#3)

## Not in scope of these fixes (intentionally excluded from the 15)

These came up during review but weren't included (smell/edge-case/future-fragility — fix later or punt):

- `BackButton` silently drops `onClick` prop when `href` is set (no current caller passes both).
- `MarkdownDocumentHeader` + `MarkdownDocumentContent` both use `mt-10`, stacking visual gap when both rendered (polish).
- `MarketingLocale` excludes ES from the project Locale union (design concern; no current bug if you fix #7 cleanly).
- `PT_BR_HOST` regex doesn't match subdomains (`staging.mabenn.com.br`) — same root as #3, fix together.
- 308 permanent redirects browser-cached aggressively (PLAUSIBLE; future fragility, not a current bug).
- Changelog page's `CHANGELOG.md` read isn't in `outputFileTracingIncludes` — works incidentally because `next.config.ts` reads the same file at build time. Fragile but functional.
- FAQ tenant-role click handler uses strict literal `'#waitlist'` comparison (future fragility if anchor renamed).

If you have time after the main 15, the polish items (`mt-10` stacking, missing `onClick` forwarding) are quick wins.

---

## Phase / task state (snapshot at 2026-05-28)

Persisted via the task tool — should survive `/clear`, but captured here as backup. **Most of the work above maps to tasks #14 (privacy page) and #15 (terms page)** — they're "code complete but pending the fixes in this doc."

### Pending (still need work — these are your next phases after the fixes above)

- **#12** — Confirm open questions with product before ship.
- **#13** — *(already marked completed; metadata/OG infra is in place but PT-BR strings are AI drafts pending native review — see decisions section above)*.
- **#14** — *(in_progress)* P4: Create privacy policy page (`/privacidade`). Code is in this branch; finalize after fixes #1–#15.
- **#15** — *(in_progress)* P4: Create terms & conditions page (`/termos`). Same — code in this branch; finalize after fixes.
- **#18** — Analytics revisit: PostHog visitor→join conversion funnel + waitlist size split by role. See memory `project_analytics_revisit` for context.
- **#22** — Notify #all-mabenn on waitlist signup. See memory; PostHog → Slack destination is the cleaner approach (don't build code-side webhook unless that's blocked).

### Completed in earlier phases (reference only — don't redo)

P1–P3 (hero, AI reframe, comparison, communication, pricing, FAQ, motion, instrumentation, localization), P5 sticky nav, CTA gradient fix, pricing copy "per rental", tenant waitlist UI + backend (`waitlist` table, RPC, Resend segments, role email), email mobile hardening, marketing metadata + OG images verified.

### Already-merged PRs (already in production)

- PR #30 (large): landing pivot redesign + tenant waitlist + welcome-email refresh + host-based marketing metadata + positioning doc.
- PR #31 (small): email layout mobile hardening.

### Branch state for the fixes in this doc

- **Branch:** `brandon/legal-pages-composable-markdown` (committed + working-tree changes).
- **Pushed:** yes, the two committed commits are on `origin`. The reset-and-restaged work is local-only.
- **PR:** not yet opened (waiting for these fixes + your decisions on the open questions).

### Operational follow-ups (post-merge, separate from the fixes above)

- **Vercel env vars** (production): rename `RESEND_WAITLIST_SEGMENT_ID` → `RESEND_WAITLIST_LANDLORD_SEGMENT_ID` (keep value), add `RESEND_WAITLIST_TENANT_SEGMENT_ID=86c7928b-ab74-4f64-8baa-105cdcbd2443`. User confirmed these were already set when the tenant-waitlist branch shipped — verify they're still there.
- **Edge function footer tagline** (parked in source from earlier): the edge function's `i18n.ts` has the new footer tagline ("Renting, made transparent") in source but **was not redeployed**. Production auth emails (confirm/reset) still show the old "Shared billing you can trust" tagline. Deploy via `mcp__supabase__deploy_edge_function` when convenient — not urgent, no auth-email path is broken.
