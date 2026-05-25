---
name: design-system
description: Use when adding/editing files under src/**/*.tsx or src/**/*.css, when reaching for a Tailwind color utility (bg-*, text-*, border-*), when adding mt-*/mb-* to a child component, or when composing a status badge.
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Design System Rules

The app should feel like a warm, editorial, instrument-precise financial workspace — similar to **Mercury** and **Linear**. Dark-first, warm near-black surfaces; a serif display voice (Fraunces) for titles and key figures; mono tabular money; one magenta accent used like a single highlighter. Calm comes from restraint and precision, not from emptiness.

## Core Design Principles

1. **Trust through clarity** — amounts, dates, statuses, and actions never compete for attention
2. **Summary first, detail second** — show the answer first, let users drill in
3. **One job per screen** — clear primary purpose and next action
4. **Mobile first for real** — designed around phone-sized viewport first
5. **Motion with purpose** — clarify, don't decorate
6. **Composed, not decorative** — visually quiet, premium, precise; restraint over flourish
7. **Dense where it's data, spacious where it's narrative** — instrument-precise rows in ledgers/tables; generous air between sections. Precise density is the goal; clutter is the enemy

## Precedence

- When this skill conflicts with `component-library`: `component-library` wins for *which component to use*; this skill wins for *visual treatment* (tokens, spacing, motion) within that component.
- When it conflicts with `frontend-patterns`: `frontend-patterns` wins for performance and `'use client'` placement; this skill wins for visual decisions.
- When a shadcn primitive uses a non-token color or off-scale spacing in its defaults, override via token. Do NOT fork the component.
- The app and storytelling surfaces share ONE warm-dark editorial language. `docs/project/design-editorial-reference.md` adds the storytelling-only *presentation* layer (hero shells, ambient glows, hand-drawn tutorial kit, real-UI-as-illustration) on top of that shared language — reach for it on landing / changelog / onboarding, not inside operating `/app/*` screens. The split is *operating vs storytelling*, not *calm vs editorial*.

## Brand and Color

MUST use semantic tokens from `src/app/globals.css`. NEVER hardcode Tailwind color utilities (`bg-zinc-*`, `text-rose-500`, `amber-500/10`, etc.). The tokens are hue-locked to the semantic system so dark-mode and subtle-surface variants stay coherent. Canonical example: `src/components/status-badge.tsx` (token-driven status mapping). Token definitions: `src/app/globals.css` `:root` block (search for `--color-primary-subtle*` and `--color-success-subtle*`).

- **Primary** (teal) — brand + interactive (buttons, links, focus rings, active states): `bg-primary`, `text-primary`, `ring-primary`. Subtle surface pair: `bg-primary-subtle` + `text-primary-subtle-foreground`.
- **Secondary accent** (magenta `--highlight`) — editorial emphasis, the moment to notice (a just-detected payment, the hero figure, a spotlight ring): `bg-highlight`, `text-highlight`, subtle pair `bg-highlight-subtle` + `text-highlight-subtle-foreground`. **One per view.** NEVER for surfaces or chrome. Teal acts; magenta points.
- **Neutrals** — warm stone family, exposed as `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground` (tier-3: dates, eyebrows, meta). Zinc is banned.
- **Semantic status** — each has a paired subtle surface for tinted backgrounds with readable glyphs:
  - success (emerald) — `bg-success` / `bg-success-subtle` / `text-success-subtle-foreground`
  - warning (amber) — `bg-warning` / `bg-warning-subtle` / `text-warning-subtle-foreground`
  - info (sky) — `bg-info` / `bg-info-subtle` / `text-info-subtle-foreground`
  - destructive (rose) — `bg-destructive` / `bg-destructive-subtle` / `text-destructive-subtle-foreground`
- **Tone discipline:** reserve `warning` / `destructive` for states where the user must act. Use `muted` for passive states ("awaiting bills"), `success` for affirmative states ("all paid"), `info` for neutral-informational.
- **Dark-first:** dark is the default theme. Warm near-black shell (`#141413` canvas, `#1a1a19` card), hairline-white borders, flattened card shadows, subtle pairs lift alpha for legibility.
- **Light mode** is supported but secondary — *same system, surfaces flip*: warm off-white canvas, white cards, warm near-black text. The tokens, type roles, and accent discipline (teal acts, magenta points) stay identical; only the surface/ink values invert. Never introduce a separate light palette — it's this system inverted, not a different one.

## Typography

- **Fonts:** body + UI labels = **Geist** (`--font-sans`); display titles + the one hero figure = **Fraunces** (`--font-display`, serif, medium weight); money/currency + eyebrow/meta = **Geist Mono** (`--font-mono`). Apply **`tabular-nums`** wherever money or aligned figures appear — it's a class you add, not a font default.
- **Serif discipline:** Fraunces for page/section titles and the single hero amount (e.g. a revenue total) — never for body, tables, or buttons.
- **Scale:** via `--font-size-*` tokens (`text-4xl` = 36px is the ceiling). Page title 28–32px, section heading 20–24px, hero amount 32–36px, card title 16–20px, body 15–17px, secondary 14px. Never below 13px on mobile. (Need a bigger figure than 36px? Add a `5xl` token — don't reach for an arbitrary px value.)
- **Rules:** money amounts prominent. Don't shrink text to fit — remove content instead.

## Spacing

- **Dual rhythm.** Generous air *between* sections (24–48px on the page); instrument-level density *within* data surfaces — ledgers, tables, multi-row cards (rows ~`py-2.5`/`py-3`, cells ~`py-3.5`). Gallery-quiet outside, tight-precise inside — that contrast is the editorial signature.
- **Hierarchy, then hairlines.** Group at the section level with spacing. *Within* dense data surfaces, hairline `border-border` dividers are the row separator — use them; don't force whitespace-only separation in tables/ledgers.
- **Scale + finer grain.** Base 4/8 rhythm (`*-1 *-2 *-3 *-4 *-6 *-8 *-10 *-12 *-16 *-24`) PLUS half-steps where precision/density needs them (`*-0.5 *-1.5 *-2.5 *-3.5`). Half-steps are the *finest* grain — no arbitrary one-off px in app code.
- **Parent owns vertical rhythm.** Containers set spacing via `flex flex-col gap-*` or `space-y-*`. Children MUST NOT set outer `mt-*`/`mb-*`/`my-*`. Anti-pattern: a section component opening with `<div className="mt-6 ...">`. Children don't know their siblings; the parent does. Exceptions: a child may own margin when it's a genuinely optional inline adornment (e.g., a helper line that may or may not render). Internal padding (`p-*`) is always the child's responsibility.

## Radius, Borders, Shadows

- **Radius tokens:** pills `rounded-full`; controls/inputs `rounded-md` (~13px, tight/instrument-precise — Mercury/Linear); cards `rounded-card` (`--radius-card: 1.25rem`); sheets `rounded-3xl`. Base `--radius: 1rem`.
- **Borders:** subtle, low-contrast via `border-border`. Don't stack border + shadow + tint.
- **Shadows:** use `shadow-card` / `shadow-card-hover` tokens on cards, `shadow-popover` on popovers (dropdown menus, date pickers, combobox). No heavy drop shadows. Dark mode neutralizes the card pair to border-only chrome.

## Status Design

- Draft → `muted`, Review needed → `warning`, Published → `primary` / `info`, Paid → `success`, Overdue → `destructive`, Disputed → `warning`, Awaiting confirmation → `info`.
- Status pills are **dot-led** (`bg-current` dot + label) or icon + text — never color-only. `rounded-full`, tinted-subtle surface + readable glyph. Consistent placement across lists, cards, detail headers. Canonical: `src/components/status-badge.tsx` (composes `ui/badge`); a magenta **spotlight** ring (`<StatusBadge spotlight>`) marks the one pill to notice.
- For dot-style status, pair the solid semantic (`bg-success`, `bg-warning`, `bg-destructive`) with a `text-*-subtle-foreground` label.

## Interaction Patterns

- Card-to-detail transitions, bottom sheets for contextual actions, inline expansion for secondary detail.
- Sticky action bars for important actions, segmented controls for filtered states.
- Clear primary CTA per screen; strong pressed/hover/focus states.
- Avoid: cluttered menus, hidden critical actions, tiny icon-only buttons, abrupt page changes.

## Motion

- Fast, smooth, controlled, restrained, premium.
- High-value: card→detail expand, bottom sheet with soft easing, status pill transitions, skeleton states matching final layout, subtle success feedback.
- Avoid: springy/bouncy in billing workflows, slow theatrical transitions, large flourishes.

## Storytelling Surfaces

The app and storytelling surfaces share this one warm-dark editorial language. Storytelling surfaces (landing, onboarding tutorials, changelog, teach-the-feature empty states, brand pages) layer an extra *presentation* kit on top — hero shells, ambient glows, hand-drawn tutorial marks, real-UI-as-illustration — documented in `docs/project/design-editorial-reference.md`.

- Operating surfaces (statements, charges, ledger, forms) → this file + `/DESIGN.md`, at operating density.
- Storytelling surfaces → also `docs/project/design-editorial-reference.md` for the presentation layer.
- Same materials (tokens, type, radius, restraint); the difference is *density and narrative devices*, not a different palette.

## Never Do This

- Hardcoded Tailwind color utilities (`bg-zinc-*`, `text-rose-500`, `amber-500/10`) — use semantic tokens.
- Tiny text to fit content, dashboard clutter, multiple competing CTAs.
- Deeply nested cards, cluttered or competing CTAs, color-only status. (Precise density in data surfaces is good — clutter is not.)
- Flashy decorative animation, desktop layouts losing calm mobile feel.
- Layout shifts from dynamic content, manually sizing icons in buttons.
- Arbitrary one-off spacing — use the 4/8 scale plus half-steps (`*-0.5 *-1.5 *-2.5 *-3.5`), nothing finer or random.

## Full Reference

For the complete app design catalog (tokens, accessibility, copy, detailed color/type mappings), see `/DESIGN.md`.

For the storytelling *presentation* layer (hero shells, glows, hand-drawn tutorial kit, real-UI-as-illustration), see `docs/project/design-editorial-reference.md`.
