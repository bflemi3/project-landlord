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

**Structure:** `h-svh flex flex-col` → content in `flex-1 overflow-y-auto` → bottom bar in `shrink-0`.

**Spacing:**
- Content area: `px-6 pt-8 pb-4`
- Between major sections: `mb-8`
- Between cards in a list: `gap-3`
- Bottom bar: `px-6 py-4`, `border-t border-border bg-background/80 backdrop-blur-lg`

**Desktop:** Cards use `md:grid-cols-2` when there are multiple items. Single-item views stay single-column.

### Header Pattern

The greeting header used on the home screen. Adapts based on context.

**Structure:**
- Line 1: Greeting or page title (`text-2xl font-bold`)
- Line 2 (optional): Revenue summary or contextual subtitle (`text-lg tabular-nums`)
- Right side: Utility icon (logout, settings)

**Revenue line format:**
- `R$ 8.850 expected · 3 properties` — when all bills are in
- `R$ 8.850 expected · 3 properties · 2 bills pending` — amber text for pending qualifier
- Always show property count for multi-property landlords

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

Composable header for interior pages (not the home screen).

**Parts:** `PageHeader`, `PageHeaderBack`, `PageHeaderContent`, `PageHeaderTitle`, `PageHeaderSubtitle`, `PageHeaderActions`

**Back button modes:**
- `chevron` (default) — left arrow, navigates back
- `close` — X icon, for sheet/modal dismissal

**Usage:** Place at the top of a page inside the scroll area. Not sticky — scrolls with content.

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
