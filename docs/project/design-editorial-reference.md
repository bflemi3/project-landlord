# Editorial Design Reference — Dark, Serif-Led, Product-Forward

## Purpose

Design rules extracted from a set of reference screenshots (Claude.ai onboarding and "ecosystem" modals) that we want mabenn to embody.

This is a **reference / aesthetic direction**, not a replacement for `design.md`. It defines the look and tone for surfaces where the product is being **shown**, **introduced**, or **narrated** — landing page, marketing, onboarding tutorials, empty states that teach, feature announcements, changelog highlights, "how it works" modals.

Where this conflicts with the core in-app design system (which is light-mode-first and calm-financial), treat this reference as dominant for **storytelling surfaces**, and the core system as dominant for **day-to-day billing workflows**.

---

## Aesthetic Direction

A confident, editorial, dark-mode presentation. Near-black warm-neutral backgrounds. Rounded cards that feel built from the same material as the shell. A serif display voice paired with a clean geometric sans-serif for interface copy. Real product imagery — screenshots, chat bubbles, terminal snippets — used as the hero content inside cards, not abstract shapes or stock illustrations. Restrained whimsy (a pixel character, a hand-drawn arrow, a highlight ring) to signal the product has personality without undermining seriousness.

Two adjectives that should always be true together:
- **Confident** — generous whitespace, decisive type, high contrast
- **Warm** — near-black not pure black, off-white not pure white, rounded not sharp

Two adjectives to avoid: **corporate**, **cold**.

---

## Color and Surfaces

Dark-first. Warm-neutral palette. Layering comes from very subtle surface shifts and hairline borders, never from heavy shadows.

### Background stack (dark)

| Role                  | Tone (approximate)          | Usage                                              |
| --------------------- | --------------------------- | -------------------------------------------------- |
| Page / modal shell    | Near-black, warm (`#141413`) | Outermost surface                                  |
| Surface 1 (card)      | One step lighter (`#1a1a19`) | Primary content card                               |
| Surface 2 (nested)    | Another half-step (`#1f1e1d`)| Illustration cards inside a step card              |
| Hairline border       | `rgba(255,255,255,0.06)`     | Card edges — barely visible, defines the container |
| Primary text          | Warm off-white (`#f5f5f4`)   | Headings, card titles                              |
| Secondary text        | Warm muted (`#a8a29e`)       | Body copy, descriptions                            |
| Tertiary / meta text  | Deeper muted (`#78716c`)     | Step labels, timestamps                            |

**Rules:**
- Never pure `#000000`. Never pure `#ffffff`. Both feel sterile in this system.
- Warm neutrals only — zinc leans cool; prefer stone / neutral.
- Layer through surface color before reaching for borders or shadows.
- Where a border is needed, keep it single-pixel and <10% alpha.

### Accent color

One warm accent, used sparingly — coral / pink / rose (`#e9408f` range) for:
- Data visualization (bar chart fills, progress)
- Character tokens (heart icons, small pills)
- Highlight rings around click targets in tutorials

Never use the accent for primary surfaces, large text, or chrome. It is reserved for moments of signal.

### Light mode behavior

When this aesthetic is inverted to light mode, the same principles hold with reversed surfaces:
- Background: warm off-white (`#faf9f7`)
- Card: white with warm hairline
- Primary text: near-black warm (`#1c1917`)
- Do **not** copy the current core-product light palette (zinc-50 / teal accent) into editorial surfaces. Editorial surfaces stay warm-neutral even in light mode.

---

## Typography

Two families. A serif with editorial character for display, a clean geometric sans-serif for UI.

### Display family — serif

Used for: modal titles, page hero headlines, major narrative headings.

- Characteristics: high-contrast serif with modern proportions (think Tiempos, GT Super, or similar). Not a classical book serif (Times). Not a slab.
- Weight: medium (500) or semibold — never hairline, never black.
- Tracking: -0.01em to -0.02em at display sizes.
- Line-height: 1.05 – 1.15 at headline sizes.
- Case: sentence case, always. Never all-caps. Never title case for headlines.

Example sizes:
- Hero / modal title: `text-[40px]` to `text-[56px]`
- Section intro: `text-[28px]` to `text-[36px]`

### UI family — sans-serif

Used for: card titles, step titles, body copy, buttons, labels, meta text.

- Characteristics: clean geometric sans with a bit of character (Söhne, Styrene, or a well-configured Inter). Avoid the default-Inter fingerprint when possible.
- Weights in use: 400 (body), 500 (UI labels, buttons), 600 (card/step titles), 700 rarely for emphasis.
- Tracking: 0 at body, -0.01em at titles.
- Line-height: 1.4 – 1.55 for body, 1.2 for titles.

Example sizes:
- Step title / card headline: `text-[22px]` to `text-[28px]` semibold
- Body / description: `text-[15px]` to `text-[17px]` regular
- Meta label ("Step 1", "Updated today"): `text-[13px]` to `text-[14px]` muted
- Button label: `text-[14px]` to `text-[15px]` medium

### Pairing rules

- Never use the serif for buttons, labels, or secondary content.
- Never use the serif and sans at similar sizes adjacent — let the serif dominate scale.
- Tabular figures (`tnum`) still required wherever money or aligned columns appear.

---

## Layout and Composition

### Shell geometry

- Modal / hero container: `rounded-[28px]` outer, generous max-width, close X top-right.
- Content cards inside shell: `rounded-[20px]` to `rounded-[24px]`.
- Illustration containers nested inside cards: `rounded-[16px]` to `rounded-[20px]`.
- Radius decreases as nesting deepens — visually reinforces hierarchy.

### Padding and rhythm

- Card internal padding: `40px` desktop, `24px` mobile minimum. Generous is the default.
- Title sits top-left with body text directly beneath; action / illustration lives in the opposite quadrant.
- Vertical rhythm between major sections: `48px` – `64px`.
- Do not crowd the close / dismiss affordance — keep at least `24px` of breathing room around it.

### Grid patterns

- One hero card full-width at top, two-column grid beneath (asymmetric hierarchy).
- Three-column grid for step sequences of equal weight.
- Avoid four or more columns — the content loses presence.
- Grids collapse to single column on mobile with no density concessions.

### Composition rules

- Title top-left, action or illustration diagonally opposite. Diagonal tension is intentional.
- Illustrations can break the card edge — a screenshot peeking from the bottom of a card is correct, not accidental.
- One primary focal element per card. If there are two, the card is overloaded — split it.

---

## Cards and Containers

- Cards are soft, rounded, and feel carved from the shell. No heavy drop shadows.
- Border is a hairline at <10% alpha — enough to define the edge, not enough to announce itself.
- Same type of content uses identical card shells — differentiate through content, never through chrome.
- List rows inside a card: hairline dividers between rows, no per-row borders.
- A card may contain a nested card (e.g. illustration within step card). The nested card is slightly lighter surface and slightly smaller radius.

---

## Illustrations and Imagery

This is the defining element of the aesthetic. The product itself is the illustration.

### Use real product UI as the hero

- Actual chat bubbles with realistic example text ("My downloads folder is a mess! Can you clean it up?") rendered in the same styling as the real product.
- Actual screenshots framed inside cards, slightly tilted or peeking, not floating in vacuum.
- Mini reproductions of real UI — terminal window with `> Fix the auth bug / * Cooking…`, browser download bar with file name and size — reconstructed at scale inside illustration areas.
- For mabenn: a real charge row, a real statement card, a real payment match event, a real ledger row — these become the illustrations.

### Hand-drawn accents

A small set of hand-drawn marks used consistently:
- Squiggle arrows connecting two elements (a file to a destination folder).
- Circled / ringed highlight around a click target (use the warm accent color).
- Hand cursor illustrations showing intended click location — small, contextual.

These are the only places a "cartoon" element appears. They are purposeful tutorial aids, not decoration.

### Character tokens

One or two small whimsical elements across the product (a pixel character, a heart icon, a waving hand) — used once, never repeated, never the focal point. The signal is *"this product has soul,"* not *"this product is playful."*

### What we do not do

- Stock illustrations of people.
- Abstract gradients or blob shapes.
- 3D-rendered abstract compositions.
- Emoji as primary imagery.
- Icon-as-illustration (a large icon standing in for a real interface).

---

## Buttons and Controls

### Primary button

- Shape: pill (`rounded-full`) or generously-rounded rectangle (`rounded-[10px]`). Pick one and stay consistent within a surface.
- Fill: warm off-white (`#f5f0e8` range), not pure white. Dark text (near-black warm).
- Weight: medium (500). Generous horizontal padding (~24px).
- No shadow. No gradient. No border.
- Hover: subtle warmth shift — slightly deeper cream.

### Secondary / ghost button

- Transparent fill.
- Hairline border at low alpha.
- White text.
- Small directional arrow (`↗`) appended when the action is navigational or external (`Install ↗`, `Learn more ↗`).
- Hover: background rises to a very faint white (4–6% alpha).

### Tertiary

- Text-only, underline on hover, muted color at rest. Used for `download manually`-style in-copy links.

### Button rules

- One primary per card. Secondary / ghost for alternates.
- Avoid three button tiers in a single card — if you have three actions, reconsider the card.
- Arrow icon appears only on navigational / external actions, never on in-place submissions.

---

## Storytelling Devices

A consistent kit used across onboarding, tutorials, and explanatory surfaces:

1. **Numbered meta labels** above step titles — `Step 1`, `Step 2`, `Step 3` — small, muted, regular weight. Never bold, never ornamental.
2. **Scribble arrows** between steps or between two on-screen elements — rough, hand-drawn feel, single-color stroke.
3. **Spotlight rings** — a circular warm-accent ring (with 2–4px stroke) drawn around a UI element to indicate the click target.
4. **Hand cursor glyphs** — small illustrated cursors showing intended interaction. Used sparingly.
5. **Mini realistic UI** — reconstructions of OS chrome (dock, file downloader, finder) used as step visuals.
6. **Chat bubbles** — rounded dark-gray bubbles with white text, rendered in the same dimensions as the real product UI. Content is conversational and specific ("Turn these receipts into an expense report"), never generic placeholder.

These devices should feel like they come from the same kit every time. Establish the set, reuse it. Don't invent new visual metaphors per surface.

---

## Motion (inferred)

Motion is restrained and premium. The still frame is the primary experience; motion softens transitions.

- Page / modal entrance: brief fade + small upward translate (`200ms` ease-out).
- Card hover: background warmth shift only, no translate or scale.
- Buttons: color transition on state change, no scale or bounce.
- Tutorial step transitions: crossfade between step cards, no slide.
- Loading: skeleton states that match final card geometry — never spinners in the content area.
- Never: spring / bounce physics, theatrical long transitions, large-flourish reveals.

---

## Copy and Tone

- Headlines are declarative and confident. "Do more with Claude, everywhere you work." "Install and open the app."
- Descriptions are short, instructive, complete sentences. No cliffhanger sentence fragments. No exclamation marks.
- In-world example text (inside chat bubbles, inside terminals) is specific and realistic — it should look like a real user session, not filler.
- Buttons are strong verbs: `Install`, `Download`, `Open`, `Launch`, `Connect`, `Get started`. Never `Click here` or `Submit`.
- No emoji in copy. Emotion comes from imagery and type, not from characters.

---

## What to Avoid in This Aesthetic

- Pure black backgrounds and pure white buttons — both feel cold and generic.
- Cool zinc or slate neutrals for editorial surfaces — warm stone is the house tone here.
- Heavy drop shadows, glassmorphism blur, aurora gradients — all read as "AI-generated SaaS landing page."
- Overuse of the warm accent color — it loses meaning if it paints everything.
- Stock-art illustrations of people, abstract blobs, 3D-rendered shapes.
- Sans-serif headlines at hero sizes — the serif is the voice, do not skip it.
- Four-column grids, dense rows, enterprise table treatments.
- Icons standing in for illustrations.
- Emoji as visual character.
- More than one primary action per card.

---

## When to Reach for This Aesthetic vs. the Core Design System

Use this editorial reference for:
- Public marketing pages (landing, pricing, features)
- First-run onboarding sequences and tutorial modals
- Changelog and release-note surfaces
- Empty states that teach a feature
- "How it works" explainer modals inside the app
- Brand moments (about page, trust page, data-handling explainer)

Use the core design system (`design.md`) for:
- Authenticated billing workflows — statements, charges, ledger, disputes
- Data-entry forms, settings, account management
- Day-to-day notifications and in-app alerts
- Any surface where the user's job is *to act on money*, not *to understand the product*

When a surface sits in both worlds (e.g. a tutorial overlay on top of a real statement screen), the underlying surface follows `design.md` and the overlay follows this reference — and both must feel like they belong to the same product through shared type, shared radius language, and shared restraint.
