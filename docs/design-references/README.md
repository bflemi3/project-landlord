# Design references — editorial product surfaces

Standalone, browser-openable HTML captures of the product UI shown *inside* the landing page's editorial frames. These are the **visual north star for the app reskin** (warm-dark + Fraunces + magenta-secondary), not production code.

Each file is self-contained (Tailwind Play CDN + Google Fonts) and shows the screen **complete and unobscured** — no device frame, no glow, no edge-blur — so every column and state is legible for reference. Captured from `src/app/(public)/landing.tsx`.

| File | Screen | Patterns it demonstrates |
|---|---|---|
| `charges-ledger.html` | Monthly charges ledger | tab bar (active underline + live dot), serif section header, 3-up aggregate strip, ledger rows, status pills (paid/due/awaiting + magenta spotlight) |
| `contract-timeline.html` | Contract lifecycle | vertical timeline nodes (past/today/future/end), IPCA rent-step accent, pending-action chip |
| `reputation.html` | Tenant + landlord reputation | reputation card (serif name · role · magenta star rating), metrics grid, dated activity feed |
| `revenue-dashboard.html` | Revenue / income | Fraunces big figures, metric strip with delta chips, cumulative income chart (magenta gradient line, area fill, now-marker, dashed projection) |

**The design language these encode** is documented in `/DESIGN.md` (app design system) and `docs/project/design-editorial-reference.md` (storytelling presentation layer). Shared rules: warm-dark surfaces (`#141413` canvas / `#1a1a19` card), text ladder `#f5f5f4 → #a8a29e → #78716c`, Fraunces (titles + big figures) / Geist (body + labels) / Geist Mono (money + meta, always tabular), teal stays primary/interactive, magenta `#e9408f` is the secondary accent used as a single highlight per view.
