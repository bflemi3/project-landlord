# Component Catalog

This document catalogs every approved component pattern in the product. When building a new feature, check here first — use existing components before creating new ones.

This is the source of truth for **what components exist, when to use them, and how to lay them out**. For visual philosophy and design tokens, see `/DESIGN.md`. For engineering patterns (hooks, forms, queries), see `CLAUDE.md`.

---

## How to Use This Document

1. Before building a screen, scan this catalog for components that fit
2. Compose screens from these components — don't reinvent card layouts, action rows, or page shells
3. When you build a new reusable component that gets approved, add it here
4. If a component needs a variant that doesn't exist, add the variant — don't create a parallel component

---

## Page Layout Patterns

### Page Shell

The standard authenticated page structure. All product screens should follow this pattern.

```
┌──────────────────────────────────┐
│  Header (greeting, title, nav)   │  ← fixed or scrolls with content
│                                  │
│  Scrollable content area         │  ← flex-1 overflow-y-auto
│  - sections with mb-8 spacing    │
│  - cards, lists, action rows     │
│                                  │
├──────────────────────────────────┤
│  Bottom bar (primary action)     │  ← sticky, border-t, backdrop-blur
└──────────────────────────────────┘
```

**Structure:** App layout (`src/app/app/layout.tsx`) provides `h-svh flex flex-col`. Pages use `h-full flex flex-col` — they inherit height from the layout, not the viewport directly. Content in `flex-1 overflow-y-auto` → bottom bar in `shrink-0`.

**Loading:** All `/app/*` pages share a single `loading.tsx` that renders `<PageLoader />`. No per-page skeletons.

**Spacing:**
- Content area: `px-6 pt-4 pb-4 md:pt-6`
- Between major sections: `mb-8`
- Between cards in a list: `gap-3`
- Bottom bar: `px-6 py-4`, `border-t border-border bg-background/80 backdrop-blur-lg`

**Desktop:** Cards use `md:grid-cols-2` when there are multiple items. Single-item views stay single-column.

### App Bar

**File:** `src/app/app/app-bar.tsx`

Desktop-only floating elements — logo (top-left) and avatar (top-right) with `hidden md:block`. Mobile pages render their own inline header (`MobileHeader` in home-content, `PageHeaderBack` on detail pages).

### Header Pattern

The greeting header used on the home screen. Adapts based on context.

**Structure:**
- Line 1: Greeting or page title (`text-2xl font-bold`)
- Line 2 (optional): Property count or contextual subtitle (`text-lg`)

**Home page layout:**
- Single property: `max-w-xl` centered
- Multiple properties: `max-w-4xl` with `md:grid-cols-2` card grid

---

## Editorial Primitives

Small, reusable building blocks that form the base of the editorial surface layer. Compose them inside cards, empty states, and sections — they encode the design system's color, weight, and rhythm decisions once so callers don't reach for raw utility classes.

### EyebrowLabel

**File:** `src/components/eyebrow-label.tsx`

Uppercase micro-label rendered above a title. Used for category, section context, or taxonomy cues. `text-xs font-semibold uppercase tracking-widest`.

**Props:** `tone` — `primary` (default) / `muted` / `foreground` / `highlight` (magenta emphasis).

```tsx
<EyebrowLabel>Billing cycle</EyebrowLabel>
<EyebrowLabel tone="muted">Getting started</EyebrowLabel>
```

### SectionLabel

**File:** `src/components/section-label.tsx`

Section heading above a grouped block (e.g., "What's next" above the action list). `text-sm font-medium text-muted-foreground` with `mb-4`. Renders `<h3>` by default; override via `as="h2" | "h4"`.

```tsx
<SectionLabel>What's next</SectionLabel>
<Card size="none">...</Card>
```

### IconTile

**File:** `src/components/icon-tile.tsx`

Rounded surface holding a single lucide icon. Used in list rows, empty states, and headers. Uses paired semantic tokens (`bg-*-subtle` + `text-*-subtle-foreground`) so tone is hue-locked to the semantic system.

**Props:**
| Prop | Values | Default |
|---|---|---|
| `size` | `sm` / `md` / `lg` | `md` |
| `shape` | `square` / `circle` | `square` |
| `tone` | `primary` / `muted` / `success` / `warning` / `info` / `destructive` / `highlight` | `primary` |

```tsx
<IconTile size="lg" shape="circle" tone="warning">
  <AlertTriangle />
</IconTile>
```

Do not hardcode color utilities (`bg-amber-500/10`, `text-rose-500`, etc.) when an `IconTile` tone expresses the same intent.

### ListRow

**File:** `src/components/list-row.tsx`

Compound primitives for list rows — a leading icon/avatar, body text, and trailing affordance. Three variants: `solid` and `dashed` render their own card-like chrome; `embedded` is chromeless and pairs with a parent `Card` + `List`.

#### Primitives

| Primitive | Purpose |
|---|---|
| `List` | Container; divides children with `divide-y divide-border/70`. |
| `ListRow` | Row shell as `<div>`. Accepts `variant` and `interactive`. |
| `ListRowButton` | Row shell as `<button>`. |
| `ListRowLeading` | `shrink-0` slot for leading icon/avatar. Typically an `IconTile`. |
| `ListRowBody` | `min-w-0 flex-1` column for title/description. |
| `ListRowTitle` | `text-base font-medium text-foreground`. |
| `ListRowDescription` | `text-sm text-muted-foreground` line below title. |
| `ListRowTrailing` | `shrink-0` slot for chevron / status / amount. |
| `ListRowChevron` | Default `ChevronRight` glyph for navigational rows. |
| `listRowClassName({ variant, interactive, className })` | Classname helper for when the row element isn't `ListRow` (e.g., a `<Link>` or `<button>` from another lib). |

#### Embedded example (inside a Card)

```tsx
<Card size="none">
  <List>
    {actions.map((a) => (
      <Link key={a.id} href={a.href} className={listRowClassName({ variant: 'embedded' })}>
        <ListRowLeading>
          <IconTile size="lg" shape="circle" tone={a.tone}>
            <a.Icon />
          </IconTile>
        </ListRowLeading>
        <ListRowBody>
          <ListRowTitle>{a.title}</ListRowTitle>
          <ListRowDescription>{a.description}</ListRowDescription>
        </ListRowBody>
        <ListRowTrailing>
          <ListRowChevron />
        </ListRowTrailing>
      </Link>
    ))}
  </List>
</Card>
```

#### Standalone example

```tsx
<ListRow variant="dashed" interactive>
  <ListRowLeading><IconTile tone="muted"><Plus /></IconTile></ListRowLeading>
  <ListRowBody>
    <ListRowTitle>Add tenant</ListRowTitle>
  </ListRowBody>
</ListRow>
```

---

### StatusBadge

**File:** `src/components/status-badge.tsx`

Dot-led status pill. Composes `ui/badge` — maps a status to a Badge variant and prepends a `bg-current` dot. Callers pass intent, not chrome.

**Props:** `variant` — `paid` / `pending` / `overdue` / `disputed` / `rejected` / `published` / `draft` / `default`. `spotlight?: boolean` forwards the magenta emphasis ring (the one to notice). Mapping: paid→`success-subtle`, pending/disputed→`warning-subtle`, overdue/rejected→`destructive-subtle`, published→`primary-subtle`, default→muted neutral, draft→dashed outline (no dot).

```tsx
<StatusBadge variant="paid" spotlight>Paid</StatusBadge>
<StatusBadge variant="pending">Due</StatusBadge>
```

## Property Cards

**File:** `src/components/property-card.tsx`

Compound primitives for property cards. Two product variants — operating (fully set up) and onboarding (still being configured) — are composed from the same primitives so card shells stay visually consistent across surfaces.

### Primitives

All parts expose `data-slot="property-card-*"` and forward their native props through `cn()`.

| Primitive | Purpose |
|---|---|
| `PropertyCard` | Card shell. Renders `<Link prefetch>` when `href` is set, else a `<div>`. Accepts `size` (defaults `md`, use `xl` for operating). |
| `PropertyCardHead` | `flex items-start justify-between gap-4` container for header row. |
| `PropertyCardBody` | `min-w-0 flex-1` column for title/subtitle text. |
| `PropertyCardEyebrow` | Uppercase micro-label above the title (e.g. billing cycle). |
| `PropertyCardTitle` | `text-xl font-semibold tracking-tight` with `first:mt-0`. Override `text-base` for compact onboarding variant. |
| `PropertyCardSubtitle` | `text-sm text-muted-foreground` line below title. |
| `PropertyCardChevron` | `ChevronRight` with hover translate-x animation via parent `group`. |
| `PropertyCardAmount` | Large `text-3xl tabular-nums` revenue number. |
| `PropertyCardStatus` | Status line with `tone`: `muted` / `success` / `warning` / `destructive` / `info`. |
| `PropertyCardProgress` | Progress bar with `completed`, `total`, optional `label`. |
| `PropertyCardSteps` | Vertical stack container for `PropertyCardStep` children. |
| `PropertyCardStep` | Single step with `state`: `done` / `inProgress` / `pending`. Auto-renders Check / Clock / empty circle. |

### Operating variant (fully set up)

```tsx
<PropertyCard href={href} size="xl">
  <PropertyCardHead>
    <PropertyCardBody>
      <PropertyCardEyebrow>{billingCycle}</PropertyCardEyebrow>
      <PropertyCardTitle>{name}</PropertyCardTitle>
      <PropertyCardSubtitle>{address}</PropertyCardSubtitle>
    </PropertyCardBody>
    <PropertyCardChevron />
  </PropertyCardHead>
  <PropertyCardAmount>{formatCurrency(...)}</PropertyCardAmount>
  <PropertyCardStatus tone="muted">{awaitingBillsLabel}</PropertyCardStatus>
</PropertyCard>
```

Use `tone="muted"` for passive states ("awaiting bills"), `tone="success"` for "all paid," and reserve `warning` / `destructive` for states where the landlord must act.

### Onboarding variant (setup in progress)

```tsx
<PropertyCard href={href} size="xl">
  <PropertyCardHead>
    <PropertyCardBody>
      <PropertyCardEyebrow>{gettingStartedLabel}</PropertyCardEyebrow>
      <PropertyCardTitle>{name}</PropertyCardTitle>
      <PropertyCardSubtitle>{address}</PropertyCardSubtitle>
    </PropertyCardBody>
    <PropertyCardChevron />
  </PropertyCardHead>
  <PropertyCardProgress completed={done} total={total} label={setupLabel} />
  <PropertyCardSteps>
    {steps.map((s) => <PropertyCardStep key={s.key} state={s.state}>{s.label}</PropertyCardStep>)}
  </PropertyCardSteps>
</PropertyCard>
```

### Helpers

- `getCompletionSteps(progress)` — returns the 4-step checklist array
- `isPropertyComplete(progress)` — boolean check
- `getStatusBadge(opData)` — returns `{ labelKey, labelParams?, dot, text }` for operating status, using semantic `bg-destructive` / `bg-warning` / `bg-success` dots

---

## Urgent Action List

**File:** `src/components/urgent-action-list.tsx`

Action rows for items needing landlord attention on the home screen (overdue payments, disputes, claims). Composes `Card` + `List` + embedded `ListRow` + `IconTile`.

**Props:** `urgentActions: UrgentAction[]`

**Action type → icon + IconTile tone:**
| Type | Icon | Tone |
|---|---|---|
| `overdue_payment` | `AlertTriangle` | `destructive` |
| `payment_claim` | `Check` | `warning` |
| `dispute` | `MessageCircle` | `warning` |
| `bill_review` | `FileText` | `info` |

Tones use the semantic subtle pairs from `IconTile`; do not hardcode color utilities.

---

## Charge Row

**File:** `src/components/charge-row.tsx`

Composable row component for displaying charges in lists. Uses the compound component pattern.

**Parts:** `ChargeRow`, `ChargeRowIcon`, `ChargeRowContent`, `ChargeRowTitle`, `ChargeRowDescription`, `ChargeRowAmount`, `ChargeRowActions`, `ChargeRowRemove`, `ChargeRowChevron`

**States:**
- Default: `border-border`, standard appearance
- Configured: `border-primary/30 bg-primary/5` — indicates charge has been set up
- Disabled: `opacity-50`, no click handler

---

## Page Header

**File:** `src/components/page-header.tsx`

Composable header for interior pages (not the home screen). Vertical layout: back link above, title below.

**Parts:** `PageHeader` (container, `mb-6`), `PageHeaderBack` (Link with ChevronLeft, `mb-3`), `PageHeaderTitle` (`text-2xl font-bold`), `PageHeaderSubtitle` (`text-sm text-muted-foreground`)

**Usage:** Place at the top of a page inside the scroll area. Not sticky — scrolls with content.

```tsx
<PageHeader>
  <PageHeaderBack href="/app">{t('back')}</PageHeaderBack>
  <PageHeaderTitle>Property Name</PageHeaderTitle>
  <PageHeaderSubtitle>123 Rua Augusta, São Paulo</PageHeaderSubtitle>
</PageHeader>
```

---

## Info Box

**File:** `src/components/info-box.tsx`

Contextual message container for inline alerts, instructions, or status messages.

**Parts:** `InfoBox`, `InfoBoxIcon`, `InfoBoxContent`, `InfoBoxDivider`

**Variants:**
| Variant | Background | Border | Text |
|---|---|---|---|
| `default` | `bg-secondary/50` | `border-border` | `text-muted-foreground` |
| `warning` | `bg-warning/10` | `border-warning/20` | `text-amber-700` |
| `success` | `bg-success/10` | `border-success/20` | `text-emerald-700` |
| `destructive` | `bg-destructive/10` | `border-destructive/20` | `text-destructive` |

**Styles:** `rounded-2xl border px-5 py-5 text-sm`. Use `InfoBoxDivider` between multiple messages inside one box.

---

## Empty State

**File:** `src/components/empty-state.tsx`

Centered icon + title + description + optional actions. Used for "no records yet" / "coming soon" / first-run states inside a section or page body.

### Primitives

| Primitive | Purpose |
|---|---|
| `EmptyState` | Container. `flex flex-col items-center justify-center gap-4 py-16 text-center` — owns the vertical rhythm; children carry no outer margins. |
| `EmptyStateIcon` | Renders the glyph inside a circle `IconTile` (size `lg`). Accepts `tone` (defaults `muted`). Pass the lucide icon as children. |
| `EmptyStateTitle` | `text-lg font-semibold tracking-tight`. |
| `EmptyStateDescription` | `text-sm leading-relaxed text-muted-foreground` with `max-w-sm`. |
| `EmptyStateActions` | Container for buttons. `flex gap-2`. Omit when no action. |

### Example

```tsx
<EmptyState>
  <EmptyStateIcon><Building2 /></EmptyStateIcon>
  <EmptyStateTitle>No providers yet</EmptyStateTitle>
  <EmptyStateDescription>Add your first provider to get started.</EmptyStateDescription>
  <EmptyStateActions>
    <Button render={<Link href="/eng/providers/new" />} nativeButton={false}>
      Add provider
    </Button>
  </EmptyStateActions>
</EmptyState>
```

Use `tone="primary"` on `EmptyStateIcon` when the empty state represents an inviting first action (e.g. "Add your first X"); keep `muted` for neutral "nothing here" states.

---

## Explainer Card

**File:** `src/components/explainer-card.tsx`

Calm, centered "why this matters" card. Used inside checkout sections, settings pages, and other surfaces where a short value statement (and optionally a CTA) precedes or replaces a form. Distinct from `EmptyState`: this is an explainer with a muted background and rounded card chrome, not a sparse "nothing here yet" page state with a large icon.

### Primitives

| Primitive | Purpose |
|---|---|
| `ExplainerCard` | Container. `bg-muted/40 flex flex-col items-center gap-6 rounded-card px-6 py-8 text-center md:px-10 md:py-10`. Dark mode: `dark:bg-foreground/10` (lifts past the muted ceiling). |
| `ExplainerCardTitle` | `text-foreground text-base font-semibold`. Renders `<h3>`. |
| `ExplainerCardDescription` | Optional one-line value statement. `text-muted-foreground text-sm leading-relaxed`. Renders `<p>`. |
| `ExplainerCardContent` | Free-form slot for richer body content (bullet lists, custom layouts). `text-foreground text-sm` so bullet text reads stronger than the muted `Description`. Lucide icons inside it get `text-primary` automatically — size and alignment stay on the call site. Override the centered alignment per-element (e.g. `text-left` on a `<ul>`) when bullet text reads better left-aligned. |
| `ExplainerCardList` / `ExplainerCardListItem` | Compositional bullet list. `List` renders `<ul className="flex flex-col gap-2 text-left">`; `ListItem` renders `<li>` with a `<Check>` icon prefix and wraps children in a `<span>`. Use this instead of hand-rolling bullet markup — three call sites (Tenants empty state, Tax-ID "why we ask", Expenses empty state) consume it. |
| `ExplainerCardAction` | Container for a primary CTA, link, or pair of buttons. Centered. Omit when no action. |

### Example

```tsx
<ExplainerCard>
  <ExplainerCardTitle>Track every recurring charge</ExplainerCardTitle>
  <ExplainerCardDescription>
    Add every recurring charge for this property — even ones your tenant pays.
  </ExplainerCardDescription>
  <ExplainerCardContent>
    <ExplainerCardList>
      <ExplainerCardListItem>
        Watch for utility, condo, and other bills automatically
      </ExplainerCardListItem>
      <ExplainerCardListItem>
        Spot bill changes (price hikes, new fees) the moment they appear
      </ExplainerCardListItem>
    </ExplainerCardList>
  </ExplainerCardContent>
  <ExplainerCardAction>
    <Button onClick={onAdd}>
      <Plus />
      Add expense
    </Button>
  </ExplainerCardAction>
</ExplainerCard>
```

Use this for wizard/section explainers (Tenants empty state, Tax ID "why we ask", Expenses empty state). Reach for `EmptyState` instead when you want a full-page-style sparse state with a circle icon tile.

---

## Animation Components

### SuspenseFadeIn

**File:** `src/components/suspense-fade-in.tsx`

Combines `<Suspense>` + `<FadeIn>` for streaming server components. The standard pattern for all streamed sections.

**Usage:**
```tsx
<SuspenseFadeIn fallback={<MySkeleton />}>
  <MyServerComponent />
</SuspenseFadeIn>
```

**When to use:** Every streaming server component section that shows a skeleton while loading.

**When not to use:** Container components (like MainColumn, Sidebar) that don't fade in themselves — use raw `<Suspense>` for those.

### FadeIn

**File:** `src/components/fade-in.tsx`

CSS-based opacity fade (0 → 1) on mount. Duration: 800ms ease-out. Server component (zero JS). Used internally by `SuspenseFadeIn` and for non-suspended sections that need a fade.

**Usage:**
```tsx
<FadeIn>
  <PropertyInfoSection />
</FadeIn>
```

### PageLoader

**File:** `src/components/page-loader.tsx`

Universal loading indicator — the mabenn "m" mark with an orbital ring animation. Replaces per-page skeletons. Used by `src/app/app/loading.tsx` which covers all `/app/*` routes via Next.js convention.

**When to use:** Don't use directly — the `loading.tsx` handles it automatically for page-level Suspense boundaries.

### FadeUp

**Files:** `src/components/fade-up.tsx` (server component), `src/components/fade-up-group.tsx` (client component)

CSS-based fade-in-and-up entrance animation. Used for staggered reveals on page load (e.g., landing page hero).

**Usage:**
```tsx
<FadeUpGroup stagger={0.08}>
  <FadeUp>First element</FadeUp>   {/* delay: 0 */}
  <FadeUp>Second element</FadeUp>  {/* delay: 0.08 */}
  <FadeUp>Third element</FadeUp>   {/* delay: 0.16 */}
</FadeUpGroup>
```

`FadeUpGroup` auto-indexes `FadeUp` children — no manual index props needed. For standalone use without a group: `<FadeUp delay={0.2}>`.

**When to use:** Page-level entrance animations for content sections.

**When not to use:** Don't animate every element. Use for major content blocks on page load, not for individual list items or form fields.

### SlideIn

**File:** `src/components/slide-in.tsx`

Horizontal slide transition for swapping content (e.g., multi-step forms).

**Props:** `activeKey` (triggers animation on change), `duration` (default 0.3s)

**When to use:** Step transitions in multi-step flows. The parent container must have `overflow-x-clip` (not `overflow-hidden` — that clips focus rings).

---

## Sticky Bottom Bar

**File:** `src/components/sticky-bottom-bar.tsx`

Persistent bottom action bar for primary CTAs on mobile.

**Styles:** `sticky bottom-0 border-t border-border bg-background px-6 py-4` with safe area inset padding.

**When to use:** Any page with a primary action that should always be visible (submit, publish, add property).

**Button inside:** Use `Button` at full width. Primary actions use default variant; secondary actions use `ghost` variant.

---

## Responsive Modal

**File:** `src/components/responsive-modal.tsx`

Dialog on desktop (`md:` and up), bottom Sheet on mobile. The standard pattern for all modals in the app. Fully compound API — the root takes no `title`/`description` props; compose the header explicitly.

**Parts:**
- `ResponsiveModal` — root, renders Dialog (desktop) or Sheet (mobile)
- `ResponsiveModal.Header` — header container (`pb-4 space-y-1`)
- `ResponsiveModal.Title` — `text-lg font-semibold text-foreground`; wraps `DialogTitle`/`SheetTitle`. Hide visually with `className="sr-only"` if you need an accessible title without visible chrome
- `ResponsiveModal.Description` — `text-base text-muted-foreground`; wraps `DialogDescription`/`SheetDescription`
- `ResponsiveModal.Content` — scrollable area with `scrollbar-gutter: stable`
- `ResponsiveModal.Footer` — sticky bottom with conditional fade mask

**Key behaviors:**
- **Accessibility fallback** — if no `Title` is composed, a dev-only `console.warn` fires and an `sr-only` `DialogTitle` is rendered so screen readers still announce the dialog. Always prefer composing a real Title.
- **Conditional fade mask** — `ResponsiveModal.Footer` only shows the `fade-mask-top` gradient when `ResponsiveModal.Content` is actually scrollable. Uses ResizeObserver in `useLayoutEffect`, shared via context. Defaults to no mask (no flash).
- **Consistent spacing** — `ResponsiveModal.Content` uses `scrollbar-gutter: stable` so content width is the same whether or not a scrollbar is present. No more `-mr-4 pr-4` hacks.
- **Surfaces** — desktop uses `rounded-card bg-card shadow-card p-6`; mobile uses `rounded-t-3xl bg-background` with safe-area padding.

**When to use Content/Footer parts:** For modals with scrollable content and a sticky action button (e.g., edit property, edit charge). For small confirm/info modals, skip Content/Footer and render directly inside the root.

**Usage:**
```tsx
<ResponsiveModal open={open} onOpenChange={setOpen}>
  <ResponsiveModal.Header>
    <ResponsiveModal.Title>Edit property</ResponsiveModal.Title>
    <ResponsiveModal.Description>Update this property's address.</ResponsiveModal.Description>
  </ResponsiveModal.Header>
  <ResponsiveModal.Content className="px-0.5">
    {/* scrollable form fields */}
  </ResponsiveModal.Content>
  <ResponsiveModal.Footer>
    <Button>Save</Button>
  </ResponsiveModal.Footer>
</ResponsiveModal>
```

---

## Property Form

**File:** `src/app/app/p/new/steps/property-form.tsx`

Composable form for property address entry. Shared between the onboarding flow and the edit property modal.

**Parts:** `PropertyForm` (root `<form>` with context), `PropertyForm.Name` (property name field), `PropertyForm.Content` (address fields — CEP, street, number, etc.), `PropertyForm.Footer` (submit button with loading state)

**Consumer controls layout via className props.** In onboarding, all parts stack vertically. In the edit modal, Name sits above `ResponsiveModal.Content` (not scrollable), Content goes inside it (scrollable), and Footer goes in `ResponsiveModal.Footer`.

**State:** Uses React context to share form state between parts. CEP auto-fill via ViaCEP provider. Server-side validation via `validateProperty` action.

---

## Detail Page Layout

**File:** `src/components/detail-page-layout.tsx`

Compound layout component for two-column detail pages (property detail, statement draft).

**Parts:** `DetailPageLayout` (root, scroll container), `DetailPageLayoutHeader` (above both columns), `DetailPageLayoutBody` (`md:flex md:gap-8`), `DetailPageLayoutMain` (`flex-1 space-y-8`), `DetailPageLayoutSidebar` (`md:w-96 md:shrink-0`)

**Behavior:** Single column on mobile (sidebar stacks below main). Two-column on desktop. Header spans full width above both columns.

---

## Billing Summary Card

**File:** `src/app/app/(main)/p/[id]/sections/billing-summary-card.tsx`

Unified financial snapshot + statement CTA for the property detail page. Fetches its own data (atomic).

**Props:** `unitId: string`, `propertyId: string`

**Layout:**
```
┌──────────────────────────────────────┐
│  R$ 4.085  tenant owes               │
│  Payment due the 5th of each month   │
│                                      │
│  ┌──────────────────────────────────┐│
│  │  Complete statement — overdue  > ││  ← tinted action area
│  │  April 2026 statement · Draft    ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**Action area urgency tints:**
| State | Background | Text |
|---|---|---|
| Normal | `bg-primary/10` | `text-primary` |
| Approaching | `bg-amber-500/10` | `text-amber-600` |
| Overdue | `bg-destructive/10` | `text-destructive` |

**When no statement:** Shows a "Generate [month] statement" button instead of the draft link.

**Financial data source:** Uses `computeFinancialSummary` — current statement > 3-statement rolling average > charge definition estimate.

---

## Charge Form Fields (shared primitives)

**File:** `src/components/charge-form-fields.tsx`

Shared form primitives used by both the onboarding charge config sheet and the statement add-charge sheet.

**Exports:** `ChargeNameInput` (hero-style bold underline input), `AmountInput` (currency input with clear button), `PayerToggle` (tenant/landlord/split segmented control), `SplitSlider` (percentage or amount mode with range input), `VariablePlaceholder` (upload hint for variable charges), `ChargeTypeSwitch` (switch-to-fixed/variable link)

---

## File Upload

**File:** `src/components/file-upload.tsx`

File picker with thumbnail preview, progress bar, size validation, and optional immediate upload to Supabase Storage.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `onFileSelect?` | `(file, storagePath?) => void` | Called when file is selected. Includes `storagePath` when `generateStoragePath` is provided. |
| `file?` | `File \| null` | Controlled file from parent |
| `uploadedUrl?` | `string \| null` | URL of an already-uploaded file (shows file card with Eye icon) |
| `uploadedFileName?` | `string \| null` | Display name for an already-uploaded file |
| `onClear?` | `() => void` | Called when file is removed |
| `hint?` | `string` | Hint text shown below "Tap to attach" in the drop zone |
| `maxSizeMB?` | `number` | Max file size (default 10) |
| `accept?` | `string` | Accepted MIME types (default PDF + images) |
| `bucket?` | `string` | Supabase Storage bucket name — enables immediate upload |
| `generateStoragePath?` | `(file) => string` | Returns a storage path for the file. Called at upload time. |
| `authToken?` | `string` | Supabase auth token for upload |
| `supabaseUrl?` | `string` | Supabase project URL for upload |
| `uploadPromiseRef?` | `MutableRefObject` | Ref set during upload so the parent can await it at save time |

**Upload mode:** When `bucket`, `generateStoragePath`, `authToken`, and `supabaseUrl` are all provided, the component uploads immediately on file select with real progress reporting. The parent can await `uploadPromiseRef.current` to wait for an in-flight upload before saving.

**States:** Empty (drop zone with optional hint), selected/uploading (file card + progress bar), uploaded (file card with Eye/X actions).

---

## Statement Draft Sections

**Files:** `src/app/app/(focused)/p/[id]/s/[statementId]/sections/`

Components for the statement draft page. Each fetches its own data (atomic pattern).

### ChargesList
Shows charge instances + missing charges. Missing charges shown first (actionable). Manual charges sorted before definition-generated. Total row at bottom.

**Props:** `statementId`, `onAddCharge?`, `onAddMissingCharge?`, `onEditCharge?`

### CompletenessWarning
Amber alert showing missing charge count with "Review" CTA that scrolls to missing charges.

**Props:** `statementId`, `onReview?`

### SummaryCard
Financial summary with publish-by date urgency. Shows "Estimated total" when charges are missing.

**Props:** `statementId`

---

## Charge Card

**File:** `src/components/charge-card.tsx`

Domain wrapper around `ChargeRow` for displaying charges on the property detail page. Adds type icon, split label, and currency formatting.

**Props:** `charge: ChargeDefinition`, `configured?: boolean`, `onClick?: () => void`, `className?: string`

**On property detail page:** Rendered inside a container with `space-y-1 rounded-2xl border border-border p-1.5`. Each card gets `className="border-transparent"`.

---

## UI Primitives (shadcn)

These live in `src/components/ui/` and are shadcn-based with product customizations.

### Button (`ui/button.tsx`)
- Has a `loading` prop for pending states — shows spinner and disables
- Icon sizing is handled by the component — never manually size icons inside buttons
- Variants: `default` (teal), `secondary` (muted fill), `destructive` (rose), `ghost`, `link`

### Input (`ui/input.tsx`)
- `h-12 rounded-2xl` — generous height, soft radius
- Has built-in clear (X) button for text-based types
- **`variant`** picks the idle background:
  - `card` (default) — `bg-muted dark:bg-foreground/5 dark:border-foreground/15`. Use when the input sits inside a `bg-card` surface (sections, sheets, dialogs). Dark mode: `muted` and `input` collapse to nearly-`card` lightness, so we tint with `foreground/N` to lift past that ceiling.
  - `page` — `bg-transparent dark:bg-input/30`. Use when the input sits directly on `bg-background`.

### InputGroup (`ui/input-group.tsx`)
- Wrapper for inputs with leading/trailing addons (icons, buttons, prefixes). Mirrors `Input`'s `card`/`page` variants — defaults to `card` so groups blend with sibling Inputs out of the box. The `IsoDatePicker` is the canonical consumer.
- Parts: `InputGroup`, `InputGroupAddon` (with `align` prop: `inline-start | inline-end | block-start | block-end`), `InputGroupInput`, `InputGroupButton` (size: `xs | sm | icon-xs | icon-sm`), `InputGroupText`.

### IsoDatePicker (`ui/iso-date-picker.tsx`)
- Date input + popover calendar. Stores ISO `YYYY-MM-DD`; renders the user's locale format in the input.
- Forwards a `variant` prop to the underlying `InputGroup` (`card` default).
- Locale-aware (en, pt-BR, es). `min`/`max` bound selectable dates.

### Select (`ui/select.tsx`)
- Styled to match Input: `h-12 rounded-2xl dark:bg-zinc-800`
- Dropdown items use `pl-3 pr-9` for check indicator room

### DropdownMenu (`ui/dropdown-menu.tsx`)
- Standard shadcn DropdownMenu, customized to the design system. Use for action menus and "More" affordances (e.g. the Expense type selector's "More options" trigger).
- Tokens: surface uses `--shadow-popover` (a softer popover-specific shadow distinct from `--shadow-card`).

### Accordion (`ui/accordion.tsx`)
- Wraps base-ui's Accordion primitive with our chrome and animation contract. Used for nested accordions inside sections (tenant rows, expense rows). The wizard's section accordion is its own primitive in `steps/checkout/section.tsx`.
- Parts: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`.
- **`AccordionItem` props:**
  - `isRemoving?: boolean` — swap the entrance for an exit animation. Pair with a `setTimeout(..., 200)` in the caller (or `useDelayedRemoval`) to drop the row from the data after the animation finishes.
  - `animateEntrance?: boolean` — opt-in mount-in fade. Default `false` so rows render at full height immediately. Set true only for rows the user just added (typically driven by `useRecentlyAdded`'s `isJustAdded(id)`). The default-off was forced by a measurement bug: when an `AccordionItem` mounts inside a parent that's also animating its scrollHeight (e.g. a section accordion opening), an entrance-collapsed item pulls the parent's measurement down and the parent snaps to its real size at animation end.

### RadioCardGroup (`components/radio-card-group.tsx`)
- Card-style radio control. Each option renders as a tappable card with optional icon. Used for picking property type, expense type, amount behavior.
- **`variant`** (cva):
  - `card` — full-bleed bordered card: `bg-muted dark:bg-foreground/5 dark:border-foreground/15`. Two-line form factor with optional icon + label + description.
  - `chip` — compact pill row, single line. Used for the "More options" affordance and the Add-row affordance in row lists.
- Helpers: `radioCardVariants` cva (for composing chip-styled buttons that aren't actual radios — e.g., the full-width "Add tenant" / "Add expense" trigger styled as a chip).

### Card (`ui/card.tsx`)
- Composable: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`, plus the `cardShellClassName` helper for non-`<div>` shells (e.g., a `<Link>` or `<button>`).
- Card shell: `rounded-card bg-card shadow-card` in light mode, border-only (`dark:border-border`) with no shadow in dark.
- **`size`** controls padding: `sm` (`p-4`) / `md` (`p-5`, default) / `lg` (`p-6`) / `xl` (`p-7`) / `compound` (`py-5`, horizontal padding deferred to children) / `none`.
- **`variant`**: `solid` (default) or `dashed` for empty/add-more placeholders.
- **`interactive`**: adds hover shadow-lift and dark-mode border accent. Use via `<Card interactive>` or `cardShellClassName({ interactive: true })`.
- Tokens: `--radius-card: 1.25rem`, `--shadow-card`, `--shadow-card-hover`. Dark mode neutralizes the shadow pair.

### Sheet (`ui/sheet.tsx`)
- Bottom sheet pattern for contextual actions
- Use for configuration panels, charge editing, secondary flows

### Badge (`ui/badge.tsx`)
- Editorial pill: `rounded-full`, `font-sans`, `text-[12px]`, dot-or-icon + label. The base for status pills.
- **`variant`**: `default` (solid teal) / `secondary` / `outline` / `ghost` / `link` / `success` (solid) / the tinted-subtle set (`success-subtle`, `primary-subtle`, `warning-subtle`, `info-subtle`, `destructive`, `highlight-subtle`) / `highlight` (solid magenta).
- **`spotlight`** (boolean): adds the magenta emphasis ring (`ring-highlight/40` + card-offset) — marks the one pill to notice. One per view.
- The `--highlight` (magenta) variants are the secondary accent; never the default. Teal acts; magenta points.

### Tabs (`ui/tabs.tsx`)
- Composable base-ui (`@base-ui/react/tabs`) primitive, restyled editorial: underline on the active trigger, muted inactive, `text-sm`. No pill/segmented chrome.
- Parts: `Tabs` (Root), `TabsList`, `TabsTrigger`, `TabsContent`. Active state binds to base-ui's `data-active` (not Radix's `data-state`).
- A live-status dot or filter affordance is consumer-added beside the list, not part of the primitive.

---

## Wordmark

**File:** `src/components/wordmark.tsx`

The mabenn wordmark — **live Fraunces text** (`font-display font-semibold`), not an image. Auto light/dark via `text-foreground`. Size with a `text-[Npx]` class (auth ~30px, headers ~20px). The SVG/PNG wordmark assets remain only for email (which can't load web fonts).

**Usage:** `<Wordmark className="text-[20px]" href="/app" />`

---

## Component Creation Rules

1. **Check shadcn first:** Before creating a component manually, run `npx shadcn@latest add <component>`
2. **Composable pattern:** Expose parts, not props. Follow the `PageHeader` / `ChargeRow` / `InfoBox` pattern with named sub-components
3. **data-slot attributes:** Every compound component part gets `data-slot="component-part-name"` for debugging and testing
4. **Never duplicate:** If markup appears in 3+ files, extract it into a shared component
5. **File location:** Product components in `src/components/`, shadcn primitives in `src/components/ui/`

---

## Layout Rules

### Mobile (default)
- Single column
- `px-6` side padding
- Cards stack vertically with `gap-3`
- Primary action in sticky bottom bar

### Desktop (`md:` breakpoint)
- Card lists use `md:grid-cols-2` when there are multiple items
- Content area stays constrained — don't let cards stretch to fill wide viewports
- Same vertical rhythm and spacing — desktop is expanded mobile, not a different design

### Section Spacing
- Between major sections (header → cards → actions): `mb-8`
- Between cards in a grid/list: `gap-3`
- Inside cards: `p-5`
- Progress bars: `mt-3 mb-3` within cards
