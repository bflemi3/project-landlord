---
# Hex below is the sRGB form of the oklch tokens in `src/app/globals.css`, which is the
# source of truth. In code, ALWAYS use the semantic utilities (bg-primary, text-highlight,
# bg-success-subtle, border-border, …) or the CSS vars — NEVER hardcode these hex values.
# Token keys here mirror the semantic token names so agents learn the names, not loose colors.
version: alpha
name: Mabenn
description: >-
  Warm-dark, editorial, instrument-precise financial workspace for Brazilian landlords and
  their tenants. Closer to Mercury and Linear than to Wise/Venmo. Dark-first; serif display
  voice (Fraunces); mono tabular money; teal as the interactive primary, magenta as the
  single emphasis accent.

colors:
  # surfaces (warm near-black — never pure #000)
  background: "#141413"
  card: "#1a1a19"
  surface-2: "#1f1e1d"
  border: "#ffffff26"            # white @ 15% — hairline, dark mode
  # text ladder (warm — never pure #fff)
  foreground: "#fafaf9"
  muted-foreground: "#a8a29e"
  subtle-foreground: "#78716c"
  # primary — brand + interactive (teal)
  primary: "#14b8a6"
  primary-foreground: "#ffffff"
  primary-subtle-foreground: "#5eead4"
  # highlight — the single emphasis accent (magenta). One per view. Never a surface/chrome.
  highlight: "#e9408f"
  highlight-foreground: "#ffffff"
  highlight-subtle-foreground: "#f0a4c5"
  # semantic status (each has a *-subtle surface = base color @ 10–15% alpha)
  success: "#10b981"
  success-subtle-foreground: "#6ee7b7"
  warning: "#f59e0b"
  warning-subtle-foreground: "#fcd34d"
  info: "#0ea5e9"
  info-subtle-foreground: "#7dd3fc"
  destructive: "#f43f5e"
  destructive-subtle-foreground: "#fda4af"
  # special
  cta-cream: "#f5f0e8"           # the one bright, solid, tappable surface (cream pill CTA)
  ink: "#1c1917"                 # text on the cream CTA

typography:
  display:                       # page / section titles
    fontFamily: Fraunces
    fontSize: 2rem               # 28–32px range; 2rem = 32px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.015em
  hero-amount:                   # the single big figure (e.g. a revenue total)
    fontFamily: Fraunces
    fontSize: 2.25rem            # 36px — the ceiling
    fontWeight: 500
    letterSpacing: -0.015em
  card-title:
    fontFamily: Geist
    fontSize: 1.0625rem          # 17px
    fontWeight: 600
    letterSpacing: -0.01em
  body:
    fontFamily: Geist
    fontSize: 1rem               # 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist
    fontSize: 0.875rem           # 14px
    fontWeight: 400
    lineHeight: 1.4
  label:                         # UI labels, buttons
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 500
  eyebrow:                       # tracked uppercase meta / section index
    fontFamily: Geist Mono
    fontSize: 0.75rem            # 12px
    fontWeight: 400
    letterSpacing: 0.12em
  amount:                        # money + aligned figures
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 400
    fontFeature: "tnum"          # tabular figures — in code, apply `tabular-nums`

rounded:
  pill: 9999px                   # rounded-full — pills, badges, primary CTA
  control: 0.8rem                # rounded-md — inputs, controls (Mercury/Linear-tight)
  card: 1.25rem                  # rounded-card
  sheet: 2.2rem                  # rounded-3xl — bottom sheets

spacing:
  "0.5": 2px
  "1": 4px
  "1.5": 6px
  "2": 8px
  "2.5": 10px
  "3": 12px
  "3.5": 14px
  "4": 16px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "24": 96px

components:
  # token mappings only — full catalog, props, and selection live in components.md + the
  # component-library skill (see Components section).
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: "{colors.primary}"        # at ~80% in code (bg-primary/80)
  status-pill:
    rounded: "{rounded.pill}"
    typography: "{typography.amount}"           # 12px / tabular family
    padding: 2px 10px
  badge-spotlight:                              # the magenta emphasis ring (the one to notice)
    # ring-2 ring-highlight/40 ring-offset-2 ring-offset-card
    textColor: "{colors.highlight}"
  tab-trigger:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
  tab-trigger-active:
    textColor: "{colors.foreground}"            # + foreground underline
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    # border: hairline {colors.border}; no heavy shadow in dark
---

# Mabenn Design System

This is the source of truth for the **app's visual language** (tokens, type, spacing, treatment). For *which component to use, its props, and composition*, see `docs/project/components.md` + the `component-library` skill. For *engineering patterns* (hooks, forms, queries), see `CLAUDE.md` + `frontend-patterns`. For the *storytelling/marketing presentation layer* (hero shells, glows, hand-drawn tutorial kit, real-UI-as-illustration), see `docs/project/design-editorial-reference.md`.

> Token discipline: the hex in the frontmatter documents what each token *is*. In code, always use the semantic utilities (`bg-primary`, `text-highlight`, `bg-success-subtle`, `border-border`) — never hardcode hex. `src/app/globals.css` (oklch) is canonical.

## Overview

The app should feel like a warm, editorial, instrument-precise financial workspace — closer to **Mercury** and **Linear** than to Wise/Venmo or property-management software. Calm comes from restraint and precision, not from emptiness.

**Three things make it unmistakably Mabenn:**
1. **Fraunces serif** for titles and the one hero figure, on a warm-dark ground.
2. **Magenta `#e9408f`** as the single emphasis accent — used like one ink, never as wallpaper.
3. **Mono tabular money** — every amount is `Geist Mono` + `tabular-nums`.

**Principles**
- **Trust through clarity** — amounts, dates, statuses, actions never compete.
- **Summary first, detail second** — show the answer, let users drill in.
- **One job per screen** — clear primary purpose and next action.
- **Mobile first for real** — designed around the phone viewport.
- **Composed, not decorative** — restraint over flourish.
- **Dense where it's data, spacious where it's narrative** — instrument-precise rows in ledgers/tables; generous air between sections. Precise density is the goal; clutter is the enemy.

**Operating vs storytelling.** The app and storytelling surfaces share ONE warm-dark editorial language. Operating surfaces (statements, charges, ledger, forms) use this doc at *operating density*. Storytelling surfaces (landing, onboarding, changelog, brand) layer a presentation kit on top — that lives in `design-editorial-reference.md`. Same materials; the difference is density and narrative devices, not a different palette.

## Colors

Hierarchy comes from **warm neutrals** first, color second. Never pure `#000`/`#fff`; the whole palette is warm (stone, not zinc).

- **Surfaces** — `background` (canvas) → `card` → `surface-2` (nested). Layer through surface color and hairline `border` before reaching for shadows.
- **Text ladder** — `foreground` → `muted-foreground` → `subtle-foreground`. Emphasis = promote a span back to `foreground` with medium weight.
- **Primary (teal) — brand + interactive.** Buttons, links, focus rings, active states. Subtle pair `bg-primary-subtle` + `text-primary-subtle-foreground`.
- **Highlight (magenta) — the emphasis accent.** The moment to notice: a just-detected payment, the hero figure, a spotlight ring. **One per view.** Never a surface or chrome. **Teal acts; magenta points.**
- **Semantic status** — `success`/`warning`/`info`/`destructive`, each with a `*-subtle` surface (base color at 10–15% alpha) + a readable `*-subtle-foreground` glyph. Reserve `warning`/`destructive` for "user must act"; `muted` for passive ("awaiting"), `success` for affirmative, `info` for neutral.
- **Dark-first.** Dark is default. Light mode = the same system inverted (warm off-white canvas, white cards, warm-near-black text) — tokens/type/accent identical, only surfaces flip. Never a separate light palette.

## Typography

Three families, three jobs — never blur them.

- **Fraunces** (`--font-display`, serif, medium) — page/section titles and the single hero figure. Tight leading, negative tracking. **Never** body, tables, or buttons.
- **Geist** (`--font-sans`) — body, UI labels, card titles, buttons.
- **Geist Mono** (`--font-mono`) — money/currency and eyebrow/meta only. Apply **`tabular-nums`** wherever money or aligned figures appear (it's a class you add).

**Scale** via `--font-size-*` tokens (`text-4xl` = 36px is the ceiling): page title 28–32px, section heading 20–24px, hero amount 32–36px, card title 16–20px, body 15–17px, secondary 14px. Never below 13px on mobile. Don't shrink text to fit — remove content instead. Need a bigger figure than 36px? Add a `5xl` token, don't use an arbitrary px.

## Layout

- **Dual rhythm.** Generous air *between* sections (24–48px on the page); instrument-level density *within* data surfaces — ledgers, tables, multi-row cards (rows ~`py-2.5`/`py-3`, cells ~`py-3.5`). Gallery-quiet outside, tight-precise inside — that contrast is the signature.
- **Hierarchy, then hairlines.** Group at the section level with spacing. *Within* dense data surfaces, hairline `border-border` dividers are the row separator — use them; don't force whitespace-only separation in tables/ledgers.
- **Scale + finer grain.** Base 4/8 rhythm plus half-steps (`*-0.5 *-1.5 *-2.5 *-3.5`) where precision/density needs them. Half-steps are the *finest* grain — no arbitrary one-off px in app code.
- **Parent owns vertical rhythm.** Containers set spacing via `flex flex-col gap-*` / `space-y-*`. Children MUST NOT set outer `mt-*`/`mb-*`/`my-*`. Internal padding (`p-*`) is always the child's responsibility. (Exception: a genuinely optional inline adornment may own its margin.)
- Horizontal padding `px-6` on mobile; content columns capped (centered narrative ≤ `max-w-3xl`, data layouts wider).

## Elevation & Depth

Layering comes from **surface color + hairline borders**, not heavy shadows.

- Cards: `shadow-card` / `shadow-card-hover` tokens. **In dark, card shadows flatten to none** — the hairline `border-border` carries the edge.
- Popovers/menus/date-pickers: `shadow-popover` (stronger; pair with a faint ring on dark so the overlay reads as elevated).
- Never stack border + shadow + tint. No glassmorphism, no aurora gradients (those read as generic SaaS).
- The big diffuse device-frame shadows + magenta glow belong to **storytelling surfaces only** (`design-editorial-reference.md`), not operating screens.

## Shapes

Radius decreases as nesting deepens.

- **Pills / badges / primary CTA** → `rounded-full` (`{rounded.pill}`).
- **Inputs / controls** → `rounded-md` (`{rounded.control}`) — tight, instrument-precise (Mercury/Linear), not pill-round.
- **Cards** → `rounded-card` (1.25rem / 20px).
- **Bottom sheets** → `rounded-3xl` (`{rounded.sheet}`).
- Base `--radius: 1rem`. Corners are rounded, never sharp — sharp reads cold.

## Components

Design-token mappings live in the frontmatter `components:` block. **The full catalog — which component exists, variants, props, when to use, composition — is in `docs/project/components.md` + the `component-library` skill.** This section only states the *editorial patterns* that are design decisions:

- **Status pill** (`status-badge.tsx` → composes `ui/badge`) — `rounded-full`, **dot-led** (`bg-current` dot + label) on a tinted-subtle surface with a readable glyph. Never color-only. A magenta **spotlight** ring (`<StatusBadge spotlight>`) marks the single pill to notice.
- **Tabs** (`ui/tabs.tsx`, composable base-ui) — underline on the active trigger, muted inactive, `text-sm`. No pill/segmented chrome.
- **Ledger row** — `label · date` (truncating) + optional sub-note, right-aligned mono amount, trailing status pill; hairline `border-border` top divider.
- **Aggregate stat strip** — small tracked-uppercase caption + mono/serif figure; emphasized cell promotes to `foreground`.
- **Card** — `bg-card`, `rounded-card`, hairline border; list rows inside use hairline dividers, never per-row borders.
- **Money** — always `Geist Mono` + `tabular-nums`.

## Do's and Don'ts

**Do**
- Use the semantic token utilities (`bg-primary`, `text-highlight`, `bg-success-subtle`) — the hex in this file documents values, it is not for hardcoding.
- Set titles + the one hero figure in Fraunces; everything else Geist; money in Geist Mono tabular.
- Use magenta like a highlighter — once per view, on the thing that matters.
- Build hierarchy with the warm-grey text ladder before any other treatment.
- Let dense data surfaces be tight and precise; let sections breathe.

**Don't**
- Hardcode hex from this file into components. Don't introduce zinc/cool neutrals or a separate light palette.
- Use pure `#000`/`#fff`. Use the serif for body, tables, or buttons. Pair magenta with the cream CTA as if interchangeable.
- Spray magenta as decoration, or use it for surfaces/chrome.
- Stack border + shadow + tint; add heavy drop shadows, glassmorphism, or glows on operating screens (those are storytelling-only).
- Use arbitrary one-off spacing — stick to the 4/8 scale + half-steps. Color-only status. Cluttered or competing CTAs (precise density is fine; clutter is not).

---

## Domain Icons

Consistent lucide icon per domain object — cards, lists, nav, section headers, empty states. Use these, not ad-hoc choices. When adding a new domain object, add it here first.

| Domain object | Lucide icon | Notes |
|---|---|---|
| Property | `Home` | |
| Rent | `DollarSign` | revenue / money in |
| Tenants | `Users` | people on a property |
| Expenses | `Zap` | utilities & recurring charges |
| CPF / identity | `CreditCard` | tax ID / identity doc |
| Bank account | `Landmark` | financial institution |
| Contract | `FileText` | legal document |
| Payments | `ArrowDownLeft` | money received |
| Disputes | `MessageSquareWarning` | contested charge |
| Notifications | `Bell` | |
| Adjustments (IPCA) | `TrendingUp` | rent adjustment over time |

## Interaction Patterns

- Card-to-detail transitions; bottom sheets for contextual actions; inline expansion for secondary detail.
- Sticky action bars for important actions; segmented controls (or the editorial underline tabs) for filtered states.
- One clear primary CTA per screen; strong pressed/hover/focus states.
- Avoid cluttered menus, hidden critical actions, tiny icon-only buttons, abrupt page changes.

## Motion

Restrained, composed, premium — clarify, don't decorate.

- Entrance: brief fade + small upward translate (~`FadeUp`, staggered). Stream content in under Suspense with skeletons that match final geometry.
- Hover: color/opacity shift (and a ≤0.5px arrow nudge) — no scale or bounce.
- Status pill / card→detail transitions soft and quick.
- Avoid springy/bouncy physics in billing workflows, theatrical long transitions, large flourishes.

## Accessibility

- Status is never color-only — always dot/icon + text.
- Maintain contrast on the warm-dark ground; the `*-subtle-foreground` glyph tokens are tuned for legibility on their tinted surfaces.
- Money/figures use `tabular-nums` so columns align and scan.
- Respect focus-visible rings (`ring-ring`); don't remove focus affordances.
- Never below 13px on mobile.

## Copy & Voice

- Declarative, confident, complete sentences. No exclamation marks, no cliffhanger fragments, no emoji in UI copy.
- Buttons are strong verbs (`Add`, `Send`, `Connect`, `Review`) — never `Click here` / `Submit`.
- Localized: EN / PT-BR / ES via `messages/*` — never hardcode user-facing strings.

## Mobile

- Phone-viewport-first; comfortable core workflows on a phone.
- Bottom sheets, segmented controls, sticky CTA bars, spacious tappable rows.
- Desktop expands mobile with more breathing room — same density discipline, not enterprise tables.
- Wide data surfaces may scroll horizontally rather than shrink text.
