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

- **Primary:** teal-500 (hover: teal-600, active: teal-700, soft surfaces: teal-50/teal-100)
- **Neutrals:** zinc family (bg: zinc-50, card: white, text: zinc-900, secondary: zinc-600, muted: zinc-500)
- **Semantic:** emerald (success), amber (warning), rose (destructive), sky (info)
- **Dark mode:** intentional, not inverted. zinc-950 bg, zinc-900 cards, strong text contrast

## Typography

- **Font:** Inter with tabular figures (`tnum`) for money
- **Scale:** page title 28-32px, section heading 20-24px, major amount 32-40px, card title 17-20px, body 16-18px, secondary 14-15px, never below 13px
- **Rules:** money amounts prominent, don't shrink text to fit — remove content instead

## Spacing

- Use spacing to create hierarchy before borders or containers
- Scale: 4px (tight), 8px (compact), 12px (small internal), 16px (primary mobile), 24px (section), 32px (major block), 40-48px (page-level desktop)

## Radius, Borders, Shadows

- **Radius:** pills: rounded-full, controls/inputs: rounded-2xl, cards: rounded-2xl/3xl, sheets: rounded-3xl. Base token: `--radius: 1rem`
- **Borders:** subtle, low-contrast. Don't add to everything or stack border+shadow+tint
- **Shadows:** very subtle, separation not drama. No heavy drop shadows

## Status Design

- Draft → zinc, Review needed → amber, Published → teal/sky, Paid → emerald, Overdue → rose, Disputed → amber/orange, Awaiting confirmation → sky
- Badge with icon + text — never color-only. Consistent placement across lists, cards, detail headers

## Interaction Patterns

- Card-to-detail transitions, bottom sheets for contextual actions, inline expansion for secondary detail
- Sticky action bars for important actions, segmented controls for filtered states
- Clear primary CTA per screen, strong pressed/hover/focus states
- Avoid: cluttered menus, hidden critical actions, tiny icon-only buttons, abrupt page changes

## Motion

- Fast, smooth, controlled, restrained, premium
- High-value: card→detail expand, bottom sheet with soft easing, status pill transitions, skeleton states matching final layout, subtle success feedback
- Avoid: springy/bouncy in billing workflows, slow theatrical transitions, large flourishes

## Never Do This

- Tiny text to fit content, dashboard clutter, multiple competing CTAs
- Deeply nested cards, enterprise-heavy aesthetics, color-only status
- Flashy decorative animation, desktop layouts losing calm mobile feel
- Layout shifts from dynamic content, manually sizing icons in buttons

## Full Reference

For the complete design catalog (screen guidance, accessibility, copy guidance, detailed color mappings), see `docs/project/design.md`.
