---
name: component-library
description: Use when adding a new file under src/components/, when JSX in a page repeats a pattern already covered by PropertyCard/ListRow/Card/InfoBox, or when reaching for raw color utilities (bg-*, text-*) instead of IconTile/EyebrowLabel/SectionLabel.
paths:
  - "src/**/*.tsx"
  - "src/components/**"
---

# Component Library Rules

**Before building any UI, check the component catalog.** MUST use existing components before creating new ones. MUST NOT create a parallel component when an existing one is close — extend it with a variant. Anti-example: adding `src/components/property-card-onboarding.tsx` next to `property-card.tsx` instead of a `size` or `variant` prop.

## Component Selection Process

1. Scan the catalog below for components that fit your need
2. Compose screens from existing components — don't reinvent layouts
3. Check shadcn first: `npx shadcn@latest add <component>` before building manually
4. If you create a new reusable component, update `docs/project/components.md`

**Precedence on conflict:** when this skill conflicts with `frontend-patterns` (e.g., performance push-to-leaves vs. compound composition), `frontend-patterns` wins for `'use client'` placement; this skill wins for markup/variant choices. When it conflicts with `design-system`, `design-system` wins for tokens/spacing/motion; this skill wins for component selection.

## Red flags — stop if you're thinking this

| Thought | Reality |
|---|---|
| "It's almost the same as `<X>` but slightly different — I'll just copy it." | Extend the existing component with a variant. A parallel file diverges immediately. |
| "I just need a small wrapper for this one screen." | It'll be reinvented in 3+ files. Compose existing primitives or extract now. |
| "Tailwind utilities are faster than reaching for `IconTile`." | Tokens drift. Use the primitive. |
| "I'll skip `data-slot` for this one part — no one targets it yet." | Then someone does, and styling/tests break. Add `data-slot` from the start. |
| "I'll write my own modal — `ResponsiveModal` doesn't quite fit." | First check whether you can extend `ResponsiveModal` with a prop. Forking creates two modals to maintain. |
| "Only one file uses this pattern — I'll extract when a second consumer appears." | If the pattern applies to every member of a system (every checkout section, every form, every card), it's cross-cutting. Extract immediately — don't wait for duplication. |

## Editorial Primitives

Small building blocks for consistent editorial surfaces. Always compose these instead of reaching for raw utility classes for eyebrows, section labels, icon surfaces, or list rows.

- **EyebrowLabel** (`src/components/eyebrow-label.tsx`) — uppercase micro-label above a title. `tone`: primary / muted / foreground.
- **SectionLabel** (`src/components/section-label.tsx`) — section heading above a grouped block (`<h3>` default; override via `as="h2" | "h4"`).
- **IconTile** (`src/components/icon-tile.tsx`) — rounded surface for a single lucide icon. `size` sm/md/lg, `shape` square/circle, `tone` primary/muted/success/warning/info/destructive. Uses semantic subtle pairs — never hardcode color utilities for icon surfaces.
- **ListRow** family (`src/components/list-row.tsx`) — `List`, `ListRow` / `ListRowButton`, `ListRowLeading`, `ListRowBody`, `ListRowTitle`, `ListRowDescription`, `ListRowTrailing`, `ListRowChevron`, plus `listRowClassName()` helper. Variants: `solid` and `dashed` render their own chrome; `embedded` is chromeless for rows inside a `Card size="none"` + `List`.

## Key Components

### Page Shell
Standard authenticated page: header at top, `flex-1 overflow-y-auto` content, sticky bottom bar. Pages use `h-full flex flex-col` inheriting from app layout. Content: `px-6 pt-4 pb-4 md:pt-6`. Between sections: `mb-8`. All pages fade in via `FadeIn`.

### Property Cards (`src/components/property-card.tsx`)
Compound primitives — same shell for operating and onboarding variants. Parts: `PropertyCard` (accepts `href` + `size`), `PropertyCardHead`, `PropertyCardBody`, `PropertyCardEyebrow`, `PropertyCardTitle`, `PropertyCardSubtitle`, `PropertyCardChevron`, `PropertyCardAmount`, `PropertyCardStatus` (tone: muted/success/warning/destructive/info), `PropertyCardProgress`, `PropertyCardSteps`, `PropertyCardStep` (state: done/inProgress/pending). Helpers: `getCompletionSteps`, `isPropertyComplete`, `getStatusBadge`.

### Page Header (`src/components/page-header.tsx`)
Composable: `PageHeader`, `PageHeaderBack` (Link + ChevronLeft), `PageHeaderTitle`, `PageHeaderSubtitle`. Vertical layout, scrolls with content.

### Charge Row (`src/components/charge-row.tsx`)
Compound: `ChargeRow`, `ChargeRowIcon`, `ChargeRowContent`, `ChargeRowTitle`, `ChargeRowDescription`, `ChargeRowAmount`, `ChargeRowActions`, `ChargeRowRemove`, `ChargeRowChevron`. States: default, configured (`border-primary/30 bg-primary/5`), disabled.

### Responsive Modal (`src/components/responsive-modal.tsx`)
Dialog on desktop, bottom Sheet on mobile. Parts: `ResponsiveModal`, `.Content` (scrollable), `.Footer` (sticky with conditional fade mask). Optional title — visually hidden when omitted. Small modals skip Content/Footer parts.

### Empty State (`src/components/empty-state.tsx`)
Compound: `EmptyState`, `EmptyStateIcon` (wraps an `IconTile`), `EmptyStateTitle`, `EmptyStateDescription`, `EmptyStateActions`. Pass the lucide icon as children of `EmptyStateIcon`; pick `tone="primary"` for inviting first actions and `muted` for neutral "nothing here" states.

### Explainer Card (`src/components/explainer-card.tsx`)
Compound: `ExplainerCard`, `ExplainerCardTitle`, `ExplainerCardDescription`, `ExplainerCardContent`, `ExplainerCardList` / `ExplainerCardListItem`, `ExplainerCardAction`. Calm, centered "why this matters" card with `bg-muted/40` chrome — used inside checkout/wizard sections (e.g. Tenants empty state, Tax ID "why we ask", Expenses empty state). `Description` is the optional one-line value statement; `Content` is a free slot for richer bodies and auto-tints lucide icons with `text-primary`. Use `ExplainerCardList` + `ExplainerCardListItem` for bullet lists (each item renders with a `<Check>` prefix automatically — never hand-roll the `<ul>` markup). Distinct from `EmptyState` — reach for that one for full-page sparse states with a circle icon tile.

### Info Box (`src/components/info-box.tsx`)
Variants: default, warning, success, destructive. Parts: `InfoBox`, `InfoBoxIcon`, `InfoBoxContent`, `InfoBoxDivider`.

### Urgent Action List (`src/components/urgent-action-list.tsx`)
Composes `Card size="none"` + `List` + embedded `ListRow` + `IconTile`. Use as the reference pattern for any home-screen "needs your attention" list.

### Sticky Bottom Bar (`src/components/sticky-bottom-bar.tsx`)
`border-t border-border` with safe area padding. For primary actions that should always be visible.

### Animation Components
- **FadeIn** (`src/components/fade-in.tsx`) — every page wraps content in this. Always pass `className="h-full"`.
- **FadeUp** (`src/components/fade-up.tsx`) — staggered reveals: `FadeUp.Group stagger={0.08}`. Major content blocks only.
- **SlideIn** (`src/components/slide-in.tsx`) — multi-step form transitions. Parent needs `overflow-x-clip`.
- **SuspenseFadeIn** (`src/components/suspense-fade-in.tsx`) — per-section Suspense boundary with fade-in on resolve.
- **PageLoader** (`src/components/page-loader.tsx`) — universal loading. Don't use directly — `loading.tsx` handles it.

### UI Primitives (shadcn, `src/components/ui/`)
- **Button** — has `loading` prop, handles icon sizing. Variants: default (teal), secondary, destructive, ghost, link.
- **Input** — `h-12 rounded-2xl`, built-in clear button. **`variant`**: `card` (default — `bg-muted dark:bg-foreground/5 dark:border-foreground/15` for inputs in `bg-card` surfaces) or `page` (transparent for inputs on `bg-background`).
- **InputGroup** (`ui/input-group.tsx`) — input + leading/trailing addons (icons, buttons). Mirrors `Input`'s `card`/`page` variants, defaults to `card`. Parts: `InputGroup`, `InputGroupAddon` (`align`: inline-start / inline-end / block-start / block-end), `InputGroupInput`, `InputGroupButton`, `InputGroupText`.
- **IsoDatePicker** (`ui/iso-date-picker.tsx`) — date input + popover calendar, locale-aware. Stores ISO `YYYY-MM-DD`. Forwards `variant` to `InputGroup`.
- **Select** — matches Input styling.
- **DropdownMenu** (`ui/dropdown-menu.tsx`) — shadcn DropdownMenu customized to the design system. Surface uses `--shadow-popover`. Use for action menus and "More" affordances.
- **Accordion** (`ui/accordion.tsx`) — base-ui Accordion with our chrome. `AccordionItem` accepts `isRemoving` (exit animation) and `animateEntrance` (opt-in mount fade — default OFF; only set true for newly-added rows, otherwise breaks parent scrollHeight measurement when the list mounts inside an opening section). Pair with `useDelayedRemoval` and `useRecentlyAdded` (see `frontend-patterns`).
- **RadioCardGroup** (`components/radio-card-group.tsx`) — card-style radio group. Variants: `card` (full-bleed bordered card with optional icon) or `chip` (compact pill row). Helper: `radioCardVariants` cva for composing chip-styled buttons that aren't actual radios (e.g. full-width "Add tenant" / "Add expense" trigger).
- **Card** — composable (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) plus the `cardShellClassName` helper for non-`<div>` shells (a `<Link>` or `<button>`). Props: `size` (sm / md / lg / xl / compound / none), `variant` (solid / dashed), `interactive`. Token chrome: `rounded-card`, `shadow-card`, `shadow-card-hover`.
- **Sheet** — bottom sheet for contextual actions.

## Layout Rules

- **Mobile:** single column, `px-6`, cards stack with `gap-3`, primary action in sticky bottom bar.
- **Desktop:** `md:grid-cols-2` for card lists, constrained content width, same spacing.
- **List containers:** wrap rows in a `Card size="none"` + `List` with embedded `ListRow`s — not individual borders per row.

## Component Creation Rules

1. Check shadcn first
2. Use composable/compound pattern (named sub-components, not prop soup)
3. MUST add `data-slot` attributes to every compound component part. Anti-pattern: a `CardHeader` rendering `<div className="...">` without `data-slot="card-header"`. Canonical example: `src/components/ui/card.tsx`.
4. Extract to shared component when markup appears in 3+ files
5. Product components: `src/components/`, shadcn primitives: `src/components/ui/`
6. Always reach for semantic tokens + editorial primitives — never hardcode color utilities or reinvent `EyebrowLabel` / `SectionLabel` / `IconTile` / `ListRow`
7. Reusable components MUST NOT set outer margin. Spacing between siblings is the parent's job via flex/grid `gap-*` or margin. Components accept `className?: string` merged via `cn()` so the parent can override when gap alone isn't sufficient.

## Full Catalog

For complete component documentation (props, all variants, detailed examples), see `docs/project/components.md`.
