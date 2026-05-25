# Mabenn Editorial Design Language

**Derived from:** the `/` landing page (`src/app/(public)/landing.tsx`) and its mockups in `.superpowers/brainstorm/`.
**Status:** New design direction. This captures the aesthetic of the landing redesign so the rest of the app can move toward it.
**Relationship to `design.md`:** `design.md` documents the current light/teal app system. This document is the *new* north star. Where they conflict, this is the intended direction going forward.

This is not a style guide bolted onto the product — it's the feeling the product should have: an **editorial, dark, warm, confident financial instrument**. Closer to a beautifully typeset annual report or a Mercury/Linear dark surface than to property-management software.

---

## 1. The aesthetic in one paragraph

A warm near-black canvas. Large serif headlines set tight, with real typographic craft. Body copy in a clean grotesque, calm and grey. Numbers in mono, always tabular. One vivid magenta accent — used sparingly, like a single ink color — for emphasis, glows, and "this is the moment." Product UI is shown inside warm-lit device frames whose edges dissolve into blur, as if you're glimpsing a real, alive app. Generous vertical silence between sections. Nothing shouts; the confidence comes from restraint and precision.

**Three things make it unmistakably Mabenn:**
1. **Fraunces serif headlines** on a warm-dark ground.
2. **The magenta `#e9408f`** as the only chromatic accent, used like a highlighter.
3. **The "device peek"** — app surfaces inside warm gradient frames that bleed off-edge through blur masks.

---

## 2. Color

The landing palette is **hardcoded hex**, not the token system in `globals.css` (that's the light app theme). These are the canonical values for this language.

### Canvas & ink (warm neutrals)

| Role | Value | Notes |
|---|---|---|
| Page background | `#141413` | Warm near-black. Never pure `#000`. |
| Primary text / "ink" | `#f5f5f4` | Warm off-white (stone-100). Headlines, emphasized body, key figures. |
| Secondary text | `#a8a29e` | Stone-400. Default body copy color. |
| Tertiary / muted | `#78716c` | Stone-500. Labels, eyebrows, metadata, dates, captions. |
| Amounts (resting) | `#d6d3d1` | Stone-300. Mono figures in rows. |
| Surface / card | `#1a1a19` | The inner app-card fill inside device frames. |
| Ink-on-light | `#1c1917` | Text on the cream CTA button. |

**Hierarchy through warmth, not just lightness:** text steps `#f5f5f4 → #a8a29e → #78716c`. Emphasis = promote a span back to `#f5f5f4` with `font-medium`. This is how body paragraphs land their key phrases.

### The accent — magenta `#e9408f`

`rgb(233, 64, 143)`. This is the secondary color the whole language hangs on. Treat it like a single ink:

- **Solid** `#e9408f` — chart line endpoints, the star rating, mechanism rule, checkmark bullets, "now" markers, the comparison closer figure.
- **Light tint** `#f0a4c5` — text on a magenta-tinted chip (e.g. a `+12%` delta).
- **Glows** — `rgba(233,64,143, 0.10–0.42)` in blurred radial gradients behind heroes, mockups, and the final CTA.
- **Selection** — `selection:bg-[#e9408f]/30`.

**Rule:** one accent moment per viewport, roughly. If two things are magenta on screen, ask which one actually deserves it. The accent marks *the thing the eye should land on* — never decoration.

### Cream CTA

| Role | Value |
|---|---|
| Primary button bg | `#f5f0e8` (hover `#ebe5d9`) |
| Primary button text | `#1c1917` |

The warm bone/cream button is the one bright, solid, tappable object on the page. It reads as "the action." Magenta is for *attention*; cream is for *action*. Don't conflate them.

### Device-frame gradient palette (the warm browns)

Device frames use diagonal gradients through warm dark browns into near-black. Stops seen across mockups:

```
#3a312b → #2b2521 → #1d1916 → #141110     (lightest-warm → black)
#2c2622 · #221d19 · #181613               (mid stops)
```

Angle varies per frame to suggest different light sources (`150deg`, `165deg`, `180deg`, `195deg`, `135deg`). The lighter warm corner always sits where a magenta glow overlays it; the opposite corner gets a black vignette.

### Semantic status

Status uses the same conventions as the app but tuned for the dark ground:

| Status | Dot / text | Surface |
|---|---|---|
| Paid / success | emerald-400 dot, emerald-300 text | `emerald-400/10` |
| Due / warning | amber-400 dot, amber-300 text | `amber-400/10` |
| Awaiting / neutral | `#78716c` dot, `#a8a29e` text | `white/[0.04]` |

Status pills are `rounded-full`, `px-2.5 py-0.5`, `text-[11px] font-medium`, dot + label. A **spotlight** variant adds `ring-2 ring-[#e9408f]/40 ring-offset-2` to mark the one row the story is about.

### Borders

Always white at low opacity, never a grey hex. Scale of intensity:

- `white/[0.04]` — internal row dividers
- `white/[0.05]` — card section dividers
- `white/[0.06]–[0.08]` — footers, faint structure
- `white/[0.10]` — card edges
- `white/[0.12]` — device-frame edges, structural rules

---

## 3. Typography

Three families, three jobs. Never blur the roles.

| Family | Variable | Role |
|---|---|---|
| **Fraunces** (serif, axes `opsz` + `SOFT`) | `--font-display` → `font-display` | Headlines and hero figures only. The voice. |
| **Geist** (grotesque) | `--font-editorial` → `font-editorial` | Body copy, UI labels, paragraphs. Default on landing (`font-editorial` on the root). |
| **Geist Mono** | `--font-mono` → `font-mono` | Every number, eyebrow label, date, index, and metadata. Always `tabular-nums`. |

> Note: the authenticated app currently defaults to **Inter** (`--font-sans`). Moving the app toward this language means adopting Geist for body and introducing Fraunces for display moments.

### Display (Fraunces)

Always `font-medium`, tight leading, negative tracking. The optical-size axis means it looks hand-set at large sizes.

| Use | Size (mobile → md) | Leading | Tracking |
|---|---|---|---|
| Hero H1 | `44px → 64px` | `1.02` | `-0.02em` |
| Big section H2 (revenue, final CTA) | `40px → 52px` | `1.05` | `-0.02em` |
| Comparison H2 | `36px → 48px` | `1.05` | `-0.015em` |
| Pillar / two-sides H2 | `34px → 44px` | `1.05` | `-0.015em` |
| Metric-strip figures | `28px → 32px` | `none` | `-0.015em` |
| Card title (inside mockups) | `14.5px → 18px` | tight | `tracking-tight` |
| Comparison closer line | `22px → 26px` | `1.45` | `-0.005em` |

Headlines often break across 2–3 hand-set lines (`<span className="block">`). Let the line breaks be intentional, not reflow accidents.

### Body (Geist / `font-editorial`)

| Use | Size | Leading | Color |
|---|---|---|---|
| Lead paragraph | `16px → 18px` | `1.55–1.65` | `#a8a29e` |
| Pillar body | `15.5px` | `1.65` | `#a8a29e` |
| Mechanism body | `14.5px` | `1.6` | `#a8a29e` |
| Fine print | `12.5px` | `1.5` | `#78716c` |

Emphasis inside body = `font-medium text-[#f5f5f4]` on the span that matters.

### Mono labels (Geist Mono)

The mono face does the "instrument panel" work — it signals precision and data.

- **Eyebrow / section label:** `font-mono text-[12px] tabular-nums text-[#78716c]` (e.g. a pillar index).
- **Numbered index:** `font-mono text-[10.5px] tabular-nums text-[#78716c]`, zero-padded `01 / 02 / 03`.
- **Amounts & figures:** `font-mono tabular-nums`, color by emphasis.

### Uppercase micro-labels (Geist)

Used for column headers, metric captions, mechanism titles:

- Mechanism title: `text-[13.5px] font-medium uppercase tracking-[0.10em] text-[#f5f5f4]`
- Aggregate / metric caption: `text-[10.5px–11.5px] uppercase tracking-[0.10em–0.14em] text-[#78716c]`

Tracking widens (`0.10–0.14em`) as size shrinks — small caps need air.

---

## 4. Layout & spatial rhythm

| Region | Max width | Notes |
|---|---|---|
| Hero, final CTA, footer | `max-w-3xl` | Centered narrative column |
| Pillars | `max-w-6xl` | Two-column: copy + sticky mockup |
| Revenue | `max-w-5xl` (intro `max-w-2xl`) | Centered intro, full-width chart |
| Comparison | `max-w-4xl` (intro `max-w-3xl`) | |
| Two sides | `max-w-5xl` | |

- **Horizontal padding:** `px-6` everywhere.
- **Section vertical rhythm:** narrative pillars `py-24 md:py-32`; "moment" sections (revenue, comparison, two-sides, final CTA) `py-32 md:py-40`. The bigger sections breathe more — silence signals importance.
- **Pillar grid:** `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`, alternating which side is 7fr so adjacent pillars mirror each other. Mockup column is `lg:sticky lg:top-24`.
- **Mobile wide mockups:** device mockups are `w-[760px]` and scroll horizontally inside `scrollbar-hide overflow-x-auto` on small screens rather than shrinking — you peek at a real-scale surface.

### Radii

| Element | Radius |
|---|---|
| Device frame | `rounded-[32px]` |
| Inner app card | `rounded-[18px]` |
| Glow halo | `rounded-[44px]` |
| Pills / buttons | `rounded-full` |
| Expanded detail block | `rounded-[10px]` |

---

## 5. Elevation, glow & the device-peek pattern

This is the signature. Get this right and everything reads as Mabenn.

### Shadows

- **Device frame:** `shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]` — deep, soft, far-thrown.
- **Inner card:** `shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]`.
- **Top hairline highlight:** a 1px `linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)` across the top edge of every frame — simulates a light catching the bevel.

### The device peek — anatomy

1. **Blurred magenta halo** behind the frame: an oversized `-inset` div, `blur-3xl`, `radial-gradient` of `rgba(233,64,143,0.14–0.16) → transparent`.
2. **Warm gradient frame:** `rounded-[32px]`, `border-white/[0.12]`, the warm-brown diagonal gradient, deep shadow, top hairline.
3. **Corner lighting inside the frame:** a magenta radial in one corner (`rgba(233,64,143,0.14–0.16)`) + a black radial vignette in the opposite corner (`rgba(0,0,0,0.45–0.5)`).
4. **Inner app card:** `#1a1a19`, `rounded-[18px]`, `border-white/[0.10]`, positioned to **bleed off one edge** (e.g. `right-[-40px]`, `right-[-80px]`) so it feels larger than the frame.
5. **Edge dissolve:** `backdrop-blur-md` overlays masked with `linear-gradient(to right/bottom, transparent X%, black 100%)` so the card's far/bottom edges blur into nothing — plus faint dark gradient overlays for depth. Content fades rather than getting cropped.

The effect: a living product surface, lit from one warm corner, glowing faintly magenta, glimpsed at the edge of focus. Use it for any "here's the product" moment.

### Ambient page glows

Heroes and the final CTA float layered magenta radials (3 stacked, increasing size + blur, decreasing opacity `0.42 → 0.22 → 0.10`) behind the content. They're `pointer-events-none aria-hidden`. The glow is the only "color temperature" on an otherwise neutral page.

---

## 6. Component vocabulary

Patterns established on the landing page, ready to reuse.

### Nav
Minimal. Wordmark in `font-display text-[22px] font-semibold tracking-tight`. Single pill action: `rounded-full border border-white/[0.12] px-4 py-1.5 text-[13px] font-medium`, hover `bg-white/[0.04]`.

### Buttons / actions
- **Primary:** cream pill — `rounded-full bg-[#f5f0e8] px-6 py-3 text-[14px] font-medium text-[#1c1917]`, trailing `→` that nudges `translate-x-0.5` on hover.
- **Secondary:** text link with a muted `↗`, `hover:opacity-80`. No border, no fill.

### Ledger row
The core data row: `label · date` (truncating, `13.5px`) on the left, mono amount (`w-[88px] text-right`), status pill (`w-[100px] text-right`). Top-border divider `white/[0.04]`. Optional sub-note in `#78716c`. An **expandable** variant reveals a detail block with a `border-l-2 border-[#e9408f]/40` accent (payer, method, reference, a matched confirmation in emerald).

### Aggregate / metric strip
A 2–3 column grid divided by `white/[0.05]`. Each cell: tiny uppercase caption + value. Two flavors:
- **Compact (in-card):** mono values, `16px`.
- **Hero metric strip:** big Fraunces figures (`28→32px`) + uppercase caption + a magenta-tinted delta chip or a trend indicator.

### Mechanism list
The recurring "how it works" pattern under each pillar: a `border-t border-white/[0.12]` with a **magenta tab** (`before:` pseudo, `h-[2px] w-12 bg-[#e9408f]`) riding the top-left of the rule. Items are numbered (`01/02/03` mono), uppercase title, grey body. `space-y-14`, generous.

### Timeline
Vertical line `white/[0.08]`; node variants — **past** (check glyph, faint fill), **today** (magenta dot in magenta ring), **future** (hollow ring), **end** (white-bordered terminal). Inline accents (e.g. an IPCA rent step `R$ 2.800 → R$ 2.937`) in mono. Optional status chip with an amber dot.

### Reputation card
`#1a1a19` card: header with name + `· role` + a magenta star and mono rating; a 2-col metrics grid (mono figure + label); an activity feed of dated rows (mono date · text · optional mono amount). Two stacked, slightly offset (`translate-x`), for landlord + tenant symmetry.

### Comparison
Desktop: a 3-column grid (`3fr / 5fr / 5fr`) — row label (uppercase muted), the "old way" column in grey, the Mabenn column in ink. Rows divided by `white/[0.05]`. Mobile: each row becomes a `#1a1a19` card with a 2-col split. Closer line is a centered Fraunces statement with the key figure in `text-[#e9408f]`.

### Two-sides bullets
Pink check bullets: `size-4 rounded-full bg-[#e9408f]/15` containing a `#e9408f` stroked check. Body `15.5px` grey. Two columns divided by `white/[0.06]`.

### Live indicator
A pinging dot: emerald `animate-ping` over a solid emerald dot + a muted "live" label. Signals real-time/passive detection.

---

## 7. Iconography

- Inline SVGs, **thin strokes** (`1.4–1.6`), `round` caps/joins. Hand-tuned paths, not an icon-font dump.
- Sizes small: `size-2.5` to `size-4` (10–16px).
- Recurring glyphs: checkmark, 5-point star (magenta fill for ratings), trend chevron, arrows (`→` action, `↗` external/jump).
- Status dots are `size-1` to `size-1.5` circles, color-coded.

---

## 8. Motion

Restrained, editorial, never bouncy.

- **Entrance:** `FadeUp` (`src/components/fade-up.tsx`) — `animate-fade-up` (opacity + 16px rise, `0.5s cubic-bezier(0.25,0.1,0.25,1)`). Stagger via explicit `delay` or `index` + `--stagger` (default `0.08s`).
- **Observed delay rhythm** within a section: `0.05 → 0.12 → 0.18 → 0.26 → 0.32 → 0.44 → 0.58`. Heading first, supporting copy, then the visual.
- **Stream-in:** `animate-fade-in` (`0.8s`) for content arriving under Suspense.
- **Hover:** color/opacity shifts and a `0.5px` arrow nudge — that's the ceiling. No scale-up, no shadow pop.
- **Section highlight:** `section-flash` (a 5s magenta box-shadow glow) for scroll-targeted emphasis.

---

## 9. Translating this to the authenticated app

The landing is the *aspirational* surface; the app is where people work. Carry the language across without making the workspace exhausting:

- **Keep:** the warm-dark option, Fraunces for page titles and key figures, mono tabular numbers everywhere money appears, the magenta-as-single-ink discipline, status pill conventions, the ledger-row anatomy, generous vertical rhythm.
- **Adapt:** dial the glows and device-frame theatrics *way* down inside the app — they're hero-page devices. A working dashboard wants calm surfaces (`#1a1a19` cards, `white/[0.10]` borders) and the accent reserved for the single most important number or action on screen.
- **Body type at work:** Geist for UI; reserve Fraunces for headers and the headline figure (e.g. the revenue total). Don't set dense tables in serif.
- **The one-accent rule scales down hard:** in a data-dense view, magenta marks *the answer* — "you're owed R$X", "this needs action" — and nothing else.

---

## 10. Do / Don't

**Do**
- Set headlines in Fraunces, tight, with intentional line breaks.
- Let money be mono and tabular, always.
- Use magenta like a highlighter — once per view, on the thing that matters.
- Build hierarchy with warm greys (`#f5f5f4 / #a8a29e / #78716c`) before reaching for any other treatment.
- Give moments room — vertical silence is the luxury signal.

**Don't**
- Use pure black (`#000`) or cool/blue greys — the whole palette is warm.
- Spray magenta as decoration, or pair it with the cream CTA as if interchangeable.
- Set body copy or tables in the serif.
- Crop product mockups with a hard edge — they should dissolve through blur.
- Add bouncy, scaling, or springy motion — this language is composed, not playful.
```
