# Component Catalog

This document catalogs every approved component pattern in the product. When building a new feature, check here first — use existing components before creating new ones.

This is the source of truth for **what components exist, when to use them, and how to lay them out**. For visual philosophy and design tokens, see `design.md`. For engineering patterns (hooks, forms, queries), see `CLAUDE.md`.

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

## Property Cards

**File:** `src/components/property-card.tsx`

Two card types sharing a consistent shell: same border, padding, shadow, hover, and header structure. The content below the header differs.

### OperatingPropertyCard

For properties that are fully set up and have billing data.

**Props:** `membership: MembershipWithProperty`, `opData?: PropertyOperationalData`

**Layout:**
```
┌──────────────────────────────────────┐
│  Property Name                    >  │  ← truncate, chevron right
│  City, State                         │  ← text-sm muted
│                                      │
│  R$ 4.850              March 2026    │  ← text-xl bold left, cycle right
│  ● All paid                          │  ← status dot + label
└──────────────────────────────────────┘
```

**Status variants:**
| Status | Dot color | Text color | Label |
|---|---|---|---|
| Healthy | `bg-emerald-500` | `text-emerald-600` | "All paid" |
| Attention | `bg-amber-500` | `text-amber-600` | "N bills pending" |
| Overdue | `bg-rose-500` | `text-rose-600` | "N unpaid" |

**Card styles:** `rounded-2xl border border-border bg-card p-5 shadow-sm` with `hover:border-primary/20 hover:shadow-md`. Dark mode: `dark:bg-zinc-800/80 dark:shadow-none dark:hover:border-primary/30`.

### SetupPropertyCard

For properties still going through onboarding. Uses the same card shell as operating cards.

**Props:** `membership: MembershipWithProperty`, `progress: PropertySetupProgress`, `pendingInvites: PendingInvite[]`

**Layout:**
```
┌──────────────────────────────────────┐
│  Property Name                    >  │  ← same header as operating
│  City, State                         │
│                                      │
│  1 of 4 steps                  25%   │  ← progress label + percentage
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← progress bar
│                                      │
│  ✓ Property created                  │  ← step checklist
│  ◷ Tenants invited                   │  ← in-progress = amber clock
│  ○ Charges configured                │  ← incomplete = empty circle
│  ○ First statement published         │
└──────────────────────────────────────┘
```

**Step states:**
| State | Icon | Text style |
|---|---|---|
| Done | Teal check in `bg-primary/10` circle | `text-muted-foreground` |
| In progress | Amber clock in `bg-amber-500/10` circle | `font-medium text-foreground` |
| Incomplete | Empty circle with `border-zinc-300` | `text-muted-foreground/60` |

**Same card styles as OperatingPropertyCard** — identical border, padding, shadow, hover. The two card types should be visually siblings in a list.

### Helpers

- `getCompletionSteps(progress)` — returns the 4-step checklist array
- `isPropertyComplete(progress)` — boolean check
- `getStatusBadge(opData)` — returns `{ label, dot, text }` for operating status

---

## Urgent Action List

**File:** `src/components/urgent-action-list.tsx`

Action rows for items that need landlord attention. Used on the home screen when there are overdue payments, disputes, or claims.

**Props:** `urgentActions: UrgentAction[]`

**Row layout:**
```
┌──────────────────────────────────────────┐
│  [icon]  Title text                   >  │
│          Description text                │
└──────────────────────────────────────────┘
```

**Action type → icon/color mapping:**
| Type | Icon | Color |
|---|---|---|
| `overdue_payment` | AlertTriangle | `text-rose-500 bg-rose-500/10` |
| `payment_claim` | Check | `text-amber-500 bg-amber-500/10` |
| `dispute` | MessageCircle | `text-amber-500 bg-amber-500/10` |
| `bill_review` | FileText | `text-sky-500 bg-sky-500/10` |

**Row styles:** `rounded-xl border border-border bg-card px-4 py-3.5` with icon in a `size-9 rounded-lg` container. Hover: `hover:border-primary/20`.

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

## Animation Components

### FadeIn

**File:** `src/components/fade-in.tsx`

Simple opacity fade (0 → 1) on mount. Default duration: 800ms. Used by every `page.tsx` to animate content in after the PageLoader resolves.

**Usage:** Wrap page content in the server component's return:
```tsx
<FadeIn className="h-full">
  <PageContent />
</FadeIn>
```

**Important:** Always pass `className="h-full"` so the flex height chain isn't broken.

### PageLoader

**File:** `src/components/page-loader.tsx`

Universal loading indicator — the mabenn "m" mark with an orbital ring animation. Replaces per-page skeletons. Used by `src/app/app/loading.tsx` which covers all `/app/*` routes via Next.js convention.

**When to use:** Don't use directly — the `loading.tsx` handles it automatically for page-level Suspense boundaries.

### FadeUp

**File:** `src/components/fade-up.tsx`

Fade-in-and-up entrance animation. Used for staggered reveals on page load.

**Usage:**
```tsx
<FadeUp.Group stagger={0.08}>
  <FadeUp>First element</FadeUp>   {/* delay: 0 */}
  <FadeUp>Second element</FadeUp>  {/* delay: 0.08 */}
  <FadeUp>Third element</FadeUp>   {/* delay: 0.16 */}
</FadeUp.Group>
```

**When to use:** Page-level entrance animations for content sections. Standard stagger: `0.08s`.

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

Dialog on desktop (`md:` and up), bottom Sheet on mobile. The standard pattern for all modals in the app.

**Parts:** `ResponsiveModal` (root), `ResponsiveModal.Content` (scrollable area), `ResponsiveModal.Footer` (sticky bottom with conditional fade mask)

**Key behaviors:**
- **Optional title** — when omitted, the header is visually hidden (`sr-only`) but remains accessible. A `pt-2` spacer is added on mobile sheets for breathing room.
- **Conditional fade mask** — `ResponsiveModal.Footer` only shows the `fade-mask-top` gradient when `ResponsiveModal.Content` is actually scrollable. Uses ResizeObserver in `useLayoutEffect`, shared via context. Defaults to no mask (no flash).
- **Consistent spacing** — `ResponsiveModal.Content` uses `scrollbar-gutter: stable` so content width is the same whether or not a scrollbar is present. No more `-mr-4 pr-4` hacks.

**When to use Content/Footer parts:** For modals with scrollable content and a sticky action button (e.g., edit property, edit charge). For small modals (invite tenant, confirm dialogs), skip the parts and just render content directly inside `ResponsiveModal`.

**Usage:**
```tsx
<ResponsiveModal open={open} onOpenChange={setOpen} title="Edit property">
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

File picker with thumbnail preview, progress bar, and size validation.

**Props:** `onFileSelect`, `file?`, `uploadedUrl?`, `progress?`, `onClear?`, `maxSizeMB?` (default 10), `accept?` (default PDF + images)

**States:** Empty (drop zone), selected (thumbnail + file info + clear), uploading (progress bar).

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
- Dark mode: `dark:bg-zinc-800`

### Select (`ui/select.tsx`)
- Styled to match Input: `h-12 rounded-2xl dark:bg-zinc-800`
- Dropdown items use `pl-3 pr-9` for check indicator room

### Card (`ui/card.tsx`)
- Composable: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `rounded-2xl` with shadow in light mode, border-only in dark mode

### Sheet (`ui/sheet.tsx`)
- Bottom sheet pattern for contextual actions
- Use for configuration panels, charge editing, secondary flows

---

## Wordmark

**File:** `src/components/wordmark.tsx`

The mabenn logo. Theme-aware — automatically swaps between light and dark variants.

**Usage:** `<Wordmark className="h-7" />`

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
