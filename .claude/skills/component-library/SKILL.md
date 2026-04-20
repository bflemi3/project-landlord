---
name: component-library
description: Component catalog and selection rules for UI consistency and reuse. Use when building any UI to check for existing components before creating new ones.
paths:
  - "src/**/*.tsx"
  - "src/components/**"
---

# Component Library Rules

**Before building any UI, check the component catalog.** Use existing components before creating new ones. If a component needs a variant that doesn't exist, add the variant — don't create a parallel component.

## Component Selection Process

1. Scan the catalog below for components that fit your need
2. Compose screens from existing components — don't reinvent layouts
3. Check shadcn first: `npx shadcn@latest add <component>` before building manually
4. If you create a new reusable component, update `docs/project/components.md`

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
- **Input** — `h-12 rounded-2xl`, built-in clear button.
- **Select** — matches Input styling.
- **Card** — composable (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) plus the `cardShellClassName` helper for non-`<div>` shells (a `<Link>` or `<button>`). Props: `size` (sm / md / lg / xl / compound / none), `variant` (solid / dashed), `interactive`. Token chrome: `rounded-card`, `shadow-card`, `shadow-card-hover`.
- **Sheet** — bottom sheet for contextual actions.

## Layout Rules

- **Mobile:** single column, `px-6`, cards stack with `gap-3`, primary action in sticky bottom bar.
- **Desktop:** `md:grid-cols-2` for card lists, constrained content width, same spacing.
- **List containers:** wrap rows in a `Card size="none"` + `List` with embedded `ListRow`s — not individual borders per row.

## Component Creation Rules

1. Check shadcn first
2. Use composable/compound pattern (named sub-components, not prop soup)
3. Add `data-slot` attributes to every compound component part
4. Extract to shared component when markup appears in 3+ files
5. Product components: `src/components/`, shadcn primitives: `src/components/ui/`
6. Always reach for semantic tokens + editorial primitives — never hardcode color utilities or reinvent `EyebrowLabel` / `SectionLabel` / `IconTile` / `ListRow`

## Full Catalog

For complete component documentation (props, all variants, detailed examples), see `docs/project/components.md`.
