# Design System and Product UI Guidance

## Purpose

This document defines the visual and interaction direction for the application. It should be used as implementation guidance when building the product with Tailwind CSS, shadcn/ui, React, and TypeScript.

This guidance should influence:

- page layout
- component selection
- typography
- spacing
- motion
- state handling
- theming
- mobile-first behavior
- interaction polish

This is not just a style guide. It is a product-experience guide.

---

## Product Design Goal

The application should feel like a calm mobile financial workspace for shared housing bills.

It should not feel like:

- legacy property-management software
- accounting software
- an ERP
- a dense landlord operations dashboard

It should feel closer to:

- Wise for calmness, whitespace, and mobile-first financial UX
- Venmo for approachable money interactions
- Rocket Money for summary modules and digestible personal finance patterns
- Linear for interaction quality, state clarity, and polished workflow behavior

Core emotional goals:

- reduce confusion
- reduce tension between people
- increase trust
- make action obvious
- make money-related workflows feel safe and clear

---

## Design Principles

### 1. Trust through clarity

Users should always understand:

- what the number is
- why it exists
- where it came from
- what they should do next

Amounts, due dates, statuses, and actions should never compete for attention.

### 2. Summary first, detail second

Show the answer first.
Then let the user drill into supporting context.

Every core screen should surface the most important answer near the top.

### 3. One job per screen

Every screen should have a clear primary purpose and a clear next action.

Avoid multi-purpose screens that try to do too much at once.

### 4. Mobile first for real

This does not mean responsive after the fact.
It means the primary workflow should be designed around a phone-sized viewport first.

### 5. Motion with purpose

Motion should clarify, not decorate.
Animation should improve continuity, reduce abruptness, and reinforce state change.

### 6. Calm, not dull

The UI should be visually quiet, but still feel premium and polished.
Whitespace, typography, and motion should do the heavy lifting.

### 7. Desktop expands mobile

Desktop should provide more breathing room and faster scanning.
It should not become a dense enterprise control panel.

---

## Technical Stack Assumptions

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mobile-first responsive design
- Light mode, dark mode, and system mode
- Animations implemented with a lightweight, modern approach
- Accessible interactions by default

---

## Brand and Visual Direction

### Brand color

Use **teal** as the primary brand color.

Preferred Tailwind brand scale:

- `teal-500` as primary
- `teal-600` for hover
- `teal-700` for active/pressed
- `teal-50` and `teal-100` for soft tinted surfaces
- `teal-400` or `teal-500` for focus ring

### Why teal

Teal provides:

- trust without feeling generic
- a modern feel without being overly blue
- financial adjacency without looking like a traditional bank
- enough energy to feel premium and alive

### Visual tone

The UI should feel:

- clean
- quiet
- modern
- soft
- spacious
- high confidence
- mobile-native

Avoid:

- loud color usage
- overly playful styling
- harsh outlines
- excessive gradients
- corporate blue overload

---

## Color System

### Neutral palette

Use **zinc** as the primary neutral family.

Recommended usage:

- app background: `zinc-50`
- card background: `white`
- subtle surface: `zinc-100`
- borders: `zinc-200`
- input borders: `zinc-300`
- primary text: `zinc-900`
- secondary text: `zinc-600`
- muted text: `zinc-500`

Dark mode direction:

- background: `zinc-950`
- elevated card: `zinc-900`
- subtle surface: `zinc-800`
- border: `zinc-800`
- primary text: `zinc-50`
- secondary text: `zinc-400`

### Semantic colors

These should be distinct from the brand color.

Use:

- success: `emerald`
- warning: `amber`
- destructive: `rose`
- info: `sky`

Suggested mappings:

- success: `emerald-600`
- warning: `amber-500`
- destructive: `rose-600`
- info: `sky-600`

Use soft backgrounds for alerts and badges:

- success tint: `emerald-50`
- warning tint: `amber-50`
- destructive tint: `rose-50`
- info tint: `sky-50`

Do not use the brand teal for every semantic state.

---

## Theme Tokens

### Light mode intent

- background: quiet neutral
- surfaces: bright and clean
- text: high contrast
- borders: low contrast but visible
- accent: teal only where meaningfully interactive

### Dark mode intent

- dark mode should feel intentional, not inverted
- surfaces should still have layering
- text contrast should remain strong
- brand color should remain consistent
- avoid muddy dark surfaces with weak contrast

### Recommended theme behavior

- support light, dark, and system mode
- preserve hierarchy across themes
- keep dark mode elegant and restrained
- do not increase saturation in dark mode unnecessarily

---

## Typography

### Typeface

Use **Inter** as the primary font family.

- Load via Google Fonts or self-host for performance
- Enable `font-feature-settings: 'tnum'` (tabular numbers) for monetary amounts and aligned columns
- Fallback stack: `Inter, system-ui, -apple-system, sans-serif`

Why Inter:

- Excellent tabular figures for a billing-heavy product
- Consistent rendering across platforms (avoids per-OS visual drift)
- Matches the calm, modern, premium feel of reference products (Wise, Linear)
- Pairs naturally with Tailwind and shadcn/ui

### General direction

Typography should be larger than typical SaaS applications.
This product should feel easy to read at a glance on a phone.

### Recommended scale

- page title: `text-[28px]` to `text-[32px]`, semibold or bold
- section heading: `text-[20px]` to `text-[24px]`, semibold
- major amount: `text-[32px]` to `text-[40px]`, bold or semibold
- card title / key row title: `text-[17px]` to `text-[20px]`, medium or semibold
- body: `text-[16px]` to `text-[18px]`
- secondary metadata: `text-[14px]` to `text-[15px]`
- helper text: avoid going below `13px`

### Typography rules

- money amounts should feel prominent
- important statuses should not be tiny
- body copy should remain comfortable on mobile
- do not shrink text to preserve layout density
- remove low-priority content before shrinking type
- preserve clear contrast between primary and secondary content

### Tone of text

Interface copy should be:

- direct
- calm
- plain
- confident
- not overly technical
- not overly playful

---

## Spacing System

### Core spacing philosophy

Use spacing to create hierarchy before using borders or extra containers.

The UI should breathe.

### Suggested spacing scale

- `4px` for very tight internal use only
- `8px` for compact gaps
- `12px` for small internal component spacing
- `16px` as a primary mobile spacing unit
- `24px` for section separation
- `32px` for major block separation
- `40px` to `48px` for page-level breathing room on larger screens

### Layout rules

- mobile layouts should feel open, not compressed
- vertical rhythm matters more than horizontal density
- prefer fewer elements per screen with better spacing
- avoid stacking many compact cards with tiny gaps

---

## Radius, Borders, and Shadows

### Radius

The product should feel soft and modern.

Suggested radius scale:

- pills and micro elements: `rounded-full` or `rounded-lg`
- controls and inputs: `rounded-2xl`
- cards: `rounded-2xl` or `rounded-3xl`
- sheets and prominent surfaces: `rounded-3xl`

Recommended base design token:

- `--radius: 1rem`

### Borders

Borders should be subtle.
Prefer low-contrast separators.

Use borders when:

- defining inputs
- separating quiet surfaces
- structuring list groupings when spacing alone is insufficient

Do not:

- add borders to everything
- stack border + shadow + tinted background without purpose

### Shadows

Use very subtle shadows.
Shadows are for separation, not drama.

Prefer:

- soft shadow on elevated surfaces only
- no heavy drop shadows
- no exaggerated layered elevation system

---

## Layout Rules

### Mobile

- single-column by default
- top content should surface main answer quickly
- primary actions should be reachable and obvious
- large touch targets
- use bottom sheets for lightweight contextual actions
- use sticky bottom action bars when appropriate

### Tablet

- slightly wider single-column or carefully split two-column when useful
- preserve large spacing and hierarchy
- do not abruptly shift to dashboard density

### Desktop

- constrain content width
- preserve breathing room
- support side-by-side layouts only when they improve scanning
- desktop is an expanded version of mobile, not a separate design language

### Content width

Do not let primary content stretch too wide on desktop.
Favor readable line length and focused composition.

---

## Interaction Model

### Overall interaction goal

The product should feel polished, predictable, and fast.

### Interaction priorities

- clear primary CTA on each screen
- strong pressed, hover, and focus states
- obvious state changes
- no ambiguity around completed actions
- smooth transitions between related views

### Preferred interaction patterns

- card-to-detail transitions
- bottom sheets for contextual actions
- inline expansion for secondary detail
- segmented controls for filtered states
- sticky action bars for important actions
- lightweight confirmations for safe actions
- stronger confirmation patterns for irreversible actions

### Avoid

- cluttered action menus
- hidden critical actions
- tiny icon-only actions for important flows
- abrupt page changes without visual continuity

---

## Motion Guidelines

### Motion philosophy

Motion should improve confidence and orientation.

It should:

- explain where the user is going
- soften state changes
- reinforce successful actions
- make the app feel premium

It should not:

- distract
- perform for its own sake
- make financial workflows feel playful or careless

### High-value motion patterns

- card expands into detail screen
- bottom sheet enters from the bottom with soft easing
- status pill transitions on state change
- list row expands to reveal additional detail
- subtle success feedback after publish, approve, confirm, or submit
- skeleton states that match final layout
- subtle highlight on new or changed information

### Motion feel

- fast
- smooth
- controlled
- restrained
- premium

Avoid:

- springy, bouncy motion in core billing workflows
- slow theatrical transitions
- large animated flourishes

---

## Information Hierarchy

### Order of importance on billing screens

1. What is due or what needs attention
2. What the amount or state means
3. What action should happen next
4. Supporting detail
5. History, metadata, and audit trail

### Core rule

The user should not need to decode the screen to find the answer.

### Examples

On a statement screen:

- amount due
- due date
- payment status
- primary action
- charge breakdown
- source support
- history

On a review screen:

- extracted amount
- confidence/warning state
- source preview
- editable fields
- approve/save action

---

## Status Design

### Importance

Status clarity is central to trust.

Users should never wonder:

- is this draft or final?
- is this paid or just submitted?
- is this under review?
- do I need to do something?

### Core status set

- Draft
- Review needed
- Published
- Paid
- Overdue
- Disputed
- Awaiting confirmation

### Status rules

- use consistent badge treatment
- keep placement predictable
- pair color with text
- use iconography only where it improves scanning
- reflect status consistently across lists, cards, and detail headers

Suggested semantic mapping:

- Draft → zinc
- Review needed → amber
- Published → teal or sky
- Paid → emerald
- Overdue → rose
- Disputed → amber or orange
- Awaiting confirmation → sky

---

## Screen Guidance

### Home

Purpose:

- orient the user
- show current state
- surface next action

Structure:

- cycle summary
- current amount / key status
- primary CTA
- pending items
- recent activity
- past statements or summaries

### Statement Screen

Purpose:

- present the monthly bill clearly and credibly

Structure:

- amount due
- due date
- status
- primary action
- grouped breakdown
- supporting source access
- dispute or question path
- history

### Review / Validation Screen

Purpose:

- let landlord safely confirm extracted bill data

Structure:

- extracted data
- validation or confidence state
- source document preview
- editable fields
- sticky confirm action

### Split / Roommate Screen

Purpose:

- make shared billing understandable and lightweight

Structure:

- total
- members
- share breakdown
- status per person
- invite / remind actions
- recent activity

### Activity / Timeline Screen

Purpose:

- show what changed and when

Structure:

- chronological entries
- clear event types
- timestamps
- actor where relevant
- drill-in to affected object

---

## Component Guidance

For the concrete component catalog (file paths, props, variants, layout rules), see `docs/project/components.md`. This section covers the design principles that govern all components.

### Favor these primitives

- cards
- list rows
- amount blocks
- status pills
- banners
- sheets
- segmented controls
- timeline rows
- document preview panes
- sticky footer action bars

### Component rules

- cards are intentional, not universal
- list rows should be spacious
- controls should feel touch-friendly
- supporting detail should expand progressively
- destructive actions should be visually distinct
- warnings should be noticeable but not alarming by default

### shadcn/ui usage guidance

Use shadcn/ui as a foundation, not a final design language.
Customize spacing, radius, typography, and visual rhythm so the product does not look like a default starter kit.

---

## Established Design Patterns

These patterns have been validated in the product and should be followed for consistency. They are the concrete rules derived from the principles above.

### Button hierarchy

- Third-party actions (Google, Apple, etc.): high-contrast neutral — never use our brand color on third-party buttons
- Our primary actions: teal primary
- Secondary/alternative actions: secondary variant (muted solid fill)
- Destructive actions: destructive variant
- Tertiary/dismissal: ghost or link style

### Inputs and controls

- Inputs should feel generous on mobile — tall enough for comfortable tapping, rounded to match the overall soft aesthetic
- Always include appropriate `autocomplete` attributes for password manager and autofill support
- Labels above inputs, not floating or inline

### Cards and containers

- Cards group related content — use them intentionally, not as decoration
- Elevated in light mode (shadow), bordered in dark mode
- Info/message containers use a subtle tinted background with borders and dividers between distinct messages
- Cards that represent the same type of data should use identical shells (same border, padding, shadow, hover) — differentiate through content, not container styling

### Success and error states

- Success states replace the full page content — don't just slap a banner on an existing form
- Structure: icon → heading → message container → action link
- Error messages belong near the action that caused them, not at the top of the page

### Navigation

- Back links always include a left chevron
- Sticky bottom bars for primary actions on mobile
- Top bars for context (title, status, back button)
- Tappable cards should show a chevron to indicate navigation

### Amounts and money

- Large, bold, prominent — money is always the primary visual element when present
- Right-aligned in lists/rows
- Use tabular figures (Inter with `tnum`)
- When showing totals with incomplete data, qualify with a count (e.g., "· 2 bills pending") rather than hiding the number

### Theme-aware assets

- Provide light and dark variants, toggle with `dark:hidden` / `dark:block`
- Never hardcode colors in SVGs that only work in one mode

### Spacing philosophy

- Use spacing to create hierarchy before reaching for borders or backgrounds
- Generous vertical rhythm — the app should breathe
- Sections separated by meaningful whitespace, major blocks by more
- Mobile-first padding on sides and inside cards

### Page-level utility UI

- Footer elements (language selector, legal links) live at the viewport bottom, outside content cards
- Smaller, more muted than content — utility, not feature

### Status indicators

- Badge with icon + text — never color-only
- Consistent placement (top-right of card or inline in row)
- Semantic color mapping: emerald = healthy/paid, amber = attention/pending, rose = overdue/unpaid, sky = info/review

### Never do this

- tiny text to fit more content
- dashboard clutter
- multiple competing primary CTAs
- deeply nested cards/boxes
- enterprise-heavy admin aesthetics
- color-only status communication
- flashy decorative animation
- desktop layouts that lose the calm mobile-first feel
- layout shifts from dynamic content — use absolute positioning or reserved space
- manually size icons inside buttons — the Button component handles icon sizing

---

## Accessibility

### Requirements

- strong text contrast
- readable body size on mobile
- visible focus states
- keyboard navigability where appropriate
- color should not be the only signal
- semantic labels for important controls
- robust handling of long text and localization
- accessible motion preferences should be respected

### Touch targets

Primary controls should be comfortably tappable on mobile.
Do not use tiny targets for important workflows.

---

## Copy and Content Guidance

### Tone

Use UI language that is:

- clear
- direct
- calm
- non-accusatory
- non-technical unless necessary

### Preferred style

- “Amount due”
- “Needs review”
- “Mark as paid”
- “Awaiting confirmation”
- “View source bill”
- “Ask a question”

Avoid:

- legalistic tone
- aggressive wording
- jargon-heavy labels
- vague system language like “process item”

---

## What to Avoid

Do not build the app to look like:

- a CRUD admin panel
- a generic B2B dashboard
- a spreadsheet replacement with thin styling
- dense table-heavy property software

Avoid:

- tiny typography
- heavy nested cards
- excessive badges
- over-colored interfaces
- too many actions per view
- decorative animation
- overuse of icons without labels
- desktop-only mental models

---

## Implementation Guardrails for Claude Code

When generating UI:

- default to mobile-first layouts
- prioritize large typography and whitespace
- preserve strong visual hierarchy
- use teal sparingly and intentionally
- keep neutrals quiet and modern
- avoid dense dashboards unless explicitly requested
- choose one primary action per screen
- use shadcn/ui components as a base, then adapt them
- favor bottom sheets, segmented controls, sticky CTA bars, and spacious list rows
- use consistent status treatments
- do not shrink type to fit more content
- do not produce default-looking shadcn starter aesthetics
- preserve a premium, polished feel through spacing and motion

When uncertain:

- choose calmer
- choose simpler
- choose more readable
- choose more trustworthy

---

## Final North Star

The finished product should feel like a calm, premium, mobile financial product for shared housing bills, with the interaction polish of a modern productivity tool and the trustworthiness of a consumer money app.
