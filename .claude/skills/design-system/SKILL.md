---
name: design-system
description: Design system rules and visual patterns for UI consistency. Use when building, modifying, or reviewing any UI component or page layout.
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Design System Rules

The app should feel like a calm mobile financial workspace for shared housing bills — closer to Wise, Venmo, Rocket Money, and Linear than property-management or accounting software.

## Core Design Principles

1. **Trust through clarity** — amounts, dates, statuses, and actions never compete for attention
2. **Summary first, detail second** — show the answer first, let users drill in
3. **One job per screen** — clear primary purpose and next action
4. **Mobile first for real** — designed around phone-sized viewport first
5. **Motion with purpose** — clarify, don't decorate
6. **Calm, not dull** — visually quiet but premium and polished
7. **Desktop expands mobile** — more breathing room, not enterprise density

## Brand and Color

Always use semantic tokens from `src/app/globals.css` — never hardcode Tailwind color utilities (`bg-zinc-*`, `text-rose-500`, `amber-500/10`, etc.). The tokens are hue-locked to the semantic system so dark-mode and subtle-surface variants stay coherent.

- **Primary** (teal): `bg-primary`, `text-primary`, `ring-primary`. Subtle surface pair: `bg-primary-subtle` + `text-primary-subtle-foreground`.
- **Neutrals** — warm stone family, exposed as `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `border-border`, `text-foreground`, `text-muted-foreground`. Zinc is banned.
- **Semantic status** — each has a paired subtle surface for tinted backgrounds with readable glyphs:
  - success (emerald) — `bg-success` / `bg-success-subtle` / `text-success-subtle-foreground`
  - warning (amber) — `bg-warning` / `bg-warning-subtle` / `text-warning-subtle-foreground`
  - info (sky) — `bg-info` / `bg-info-subtle` / `text-info-subtle-foreground`
  - destructive (rose) — `bg-destructive` / `bg-destructive-subtle` / `text-destructive-subtle-foreground`
- **Tone discipline:** reserve `warning` / `destructive` for states where the user must act. Use `muted` for passive states ("awaiting bills"), `success` for affirmative states ("all paid"), `info` for neutral-informational.
- **Dark mode:** intentional, not inverted — warm-stone shell, flattened card shadows, subtle pairs lift alpha for legibility.

## Typography

- **Font:** Inter with tabular figures (`tnum`) for money.
- **Scale:** via `--font-size-*` tokens (`text-xs` → `text-2xl`). Page title 28–32px, section heading 20–24px, major amount 32–40px, card title 17–20px, body 16–18px, secondary 14–15px. Never below 13px on mobile.
- **Rules:** money amounts prominent. Don't shrink text to fit — remove content instead.

## Spacing

- Use spacing to create hierarchy before borders or containers.
- Scale: 4px (tight), 8px (compact), 12px (small internal), 16px (primary mobile), 24px (section), 32px (major block), 40–48px (page-level desktop).
- Stick to the 4/8 rhythm. Avoid off-scale utilities like `mt-7`, `gap-5`.

## Radius, Borders, Shadows

- **Radius tokens:** pills `rounded-full`; controls/inputs `rounded-2xl`; cards `rounded-card` (`--radius-card: 1.25rem`); sheets `rounded-3xl`. Base `--radius: 1rem`.
- **Borders:** subtle, low-contrast via `border-border`. Don't stack border + shadow + tint.
- **Shadows:** use `shadow-card` / `shadow-card-hover` tokens on cards. No heavy drop shadows. Dark mode neutralizes both to border-only chrome.

## Status Design

- Draft → `muted`, Review needed → `warning`, Published → `primary` / `info`, Paid → `success`, Overdue → `destructive`, Disputed → `warning`, Awaiting confirmation → `info`.
- Badge with icon + text — never color-only. Consistent placement across lists, cards, detail headers.
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

## Editorial Surfaces

For storytelling surfaces (landing page, onboarding tutorials, changelog, teach-the-feature empty states, brand pages), follow the editorial reference in `docs/project/design-editorial-reference.md`. It defines a warm dark-first, serif-led presentation for moments where the product is *being introduced* rather than *being operated*.

- In-app billing workflows → this file + `docs/project/design.md`.
- Editorial / storytelling overlays → the editorial reference.

## Never Do This

- Hardcoded Tailwind color utilities (`bg-zinc-*`, `text-rose-500`, `amber-500/10`) — use semantic tokens.
- Tiny text to fit content, dashboard clutter, multiple competing CTAs.
- Deeply nested cards, enterprise-heavy aesthetics, color-only status.
- Flashy decorative animation, desktop layouts losing calm mobile feel.
- Layout shifts from dynamic content, manually sizing icons in buttons.
- Off-scale spacing (`mt-7`, `gap-5`) — stick to 4/8 rhythm.

## Full Reference

For the complete design catalog (screen guidance, accessibility, copy guidance, detailed color mappings), see `docs/project/design.md`.

For the editorial aesthetic (warm dark, serif display, storytelling surfaces), see `docs/project/design-editorial-reference.md`.
