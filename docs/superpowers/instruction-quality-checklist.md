# Instruction Quality Checklist v2

Apply this to a target instruction surface: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/skills/*/SKILL.md`, or a memory file. For each criterion the file fails, propose one concrete edit (specific text — `OLD: ...` → `NEW: ...`, not vague advice).

**Reference exemplars** (read these before applying the checklist):
- Strong: `/Users/brandonfleming/dev/project-landlord/.claude/skills/auth/SKILL.md` — should pass most criteria.
- Weak: `/Users/brandonfleming/dev/project-landlord/.claude/skills/frontend-patterns/SKILL.md` — should fail most criteria.

If your scoring of these two diverges from "auth passes most, frontend-patterns fails most," the checklist is miscalibrated. Stop and report.

## C1 — Auto-loadable at moment of decision

**Test:** Is the rule body reachable without explicit Read? Auto-loadable surfaces: `CLAUDE.md`, `.claude/rules/*` (referenced from CLAUDE.md), or `.claude/skills/*` with frontmatter `paths:` matching the working file.
**FAIL signature:** Rule body lives only in user memory body, commit message, plan doc, or PR description. Index summary may be auto-loaded but body isn't.
**Source:** Agent 4a forensic — Rule 2 (store-source-of-truth) lived in user memory body; only the one-line index summary auto-loaded.

## C2 — Hard imperative + concrete violation signature

**Test:** Rule uses MUST / NEVER / MUST NOT, AND names the violation in one of:
- (a) regex/code pattern in backticks (e.g., `` `stored ?? default*` ``)
- (b) named anti-example file or symbol
- (c) verbatim quote of the violating phrase or pattern

**FAIL signature:** Soft modals (`should`, `prefer`, `avoid`, `consider`); MUST without a violation pattern; description-only with no quotable signal.
**PASS exemplar:** `auth/SKILL.md` invariant 7: *"Any DB op the user's RLS doesn't permit must live in a SECURITY DEFINER RPC. Do not add service-role admin calls from TS code."*
**Source:** Agent 4a (rule-firing condition 2), Agent 1 (rationalization-bait phrasings pervasive in existing skills).

## C3 — Description triggers on symptoms, not topics

**Test:** Does the frontmatter `description` name the moments to invoke (symptoms a fresh Claude would notice), or summarize the topics covered?
**FAIL signature:** Topic list (e.g., *"Performance, data fetching, hooks, forms"*).
**PASS exemplar:** `auth/SKILL.md` description: *"Use when touching /auth/* routes, supabase middleware, the redemption core, or migrations on auth.users/profiles/invitations/memberships."*
**Source:** `writing-skills/SKILL.md` lines 154–158: *"when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content... The skill body becomes documentation Claude skips."*

## C4 — Red-flag / anti-pattern content

**Test:** For discipline-enforcing skills (rules the AI must follow under pressure), does the file include either (a) a rationalization table mapping common excuses → reality, or (b) a red-flag list of in-the-moment thoughts that signal an impending violation?
**FAIL signature:** Only positive prescription. No "if you're thinking X, stop." Applies only to discipline skills; reference-only skills (e.g., catalogs) are exempt.
**Source:** `writing-skills/SKILL.md` "Bulletproofing Skills Against Rationalization" — recommends rationalization tables for discipline skills. Agent 1 noted only `design-system` has anti-pattern content.

## C5 — Tiebreak with peer rules

**Test:** When this rule could conflict with another, is the precedence specified or referenced?
**FAIL signature:** Rule reads as standalone. No path to resolve conflicts (e.g., "use existing component" vs "the existing component is wrong").
**Source:** Agent 4a (rule-firing condition 3), Agent 3 (gate-conflict resolution missing).

## C6 — Foundational-restatement check

**Test:** Does the rule restate something Claude already knows from training (SOLID, SRP, encapsulation, DRY, "prefer composition")?
**If yes:** prose alone won't fire reliably. The rule MUST reference a lint rule, hook, or post-edit check that enforces the principle.
**FAIL signature:** Prose-only restatement of a foundational principle with no enforcement backup named.
**Source:** `writing-skills/SKILL.md` line 59: *"Mechanical constraints (if it's enforceable with regex/validation, automate it — save documentation for judgment calls)."*

## C7 — Canonical example pointer

**Test:** Does the rule point at a concrete example with file path AND symbol/line range — not bare directory?
**FAIL signature:** Abstract description only; bare directory pointer (e.g., `src/data/<domain>/`); no specific working code reference.
**PASS exemplar:** `auth/SKILL.md` line 23: *"read `docs/project/architecture-auth.md` end-to-end"* + invariant 7 references migration `20260420154115` for the RPC.
**Source:** Agent 3 (one annotated example beats abstract principles), Agent 2 (`auth/`, `data-modeling/`, `billing-automation/` are project templates).

## C8 — In-scope coverage

**Test:** Does the file claim coverage of a topic but omit a sub-topic Claude has been observed to violate?
**FAIL signature:** Skill description claims "X conventions" but body omits a known sub-pattern (e.g., `frontend-patterns` claims "hooks discipline" but doesn't address memoization at all).
**Source:** Agent 1 (memoization missing from `frontend-patterns/SKILL.md` despite frontmatter claim of hooks coverage).

## C9 — Length / density

**Test:** Skill body under ~800 words. Larger files use sibling reference files for heavy content (per progressive-disclosure pattern).
**FAIL signature:** Single flat document over 800 words mixing high-priority invariants with low-priority reference material.
**Source:** `writing-skills/SKILL.md` recommends <500 words for non-foundational skills, with progressive disclosure beyond.

## C10 — Frontmatter conformance

**Test:** Frontmatter fields are limited to: `name`, `description`, `paths` (project convention for auto-load triggers).
**FAIL signature:** Non-standard fields beyond these three. Or missing required `name` / `description`.
**Source:** Agent 1 — `paths:` is non-standard per Anthropic's published spec but consistent across this project's skills (project convention; document explicitly).

## C11 — Voice consistency with project templates

**Test:** Voice and structure match named project template skills (`auth/`, `data-modeling/`, `billing-automation/`).
**FAIL signature:** Reference-prose where numbered invariants are the project standard; missing TL;DR; narrative tone where imperatives are expected.
**Source:** Agent 1 (cross-skill voice inconsistency), Agent 2 (named templates exist; new and existing skills should match).

## C12 — Self-application

**Test:** Does this checklist itself pass C1–C11?
**FAIL signature:** Soft modals in this file; no rationalization table for reviewers; no PASS exemplars pointing at real project files; runs over 800 words without sibling references.
**Source:** Reviewer of v1 found that v1 itself failed C2, C4, partial C7.

## Reviewer output format

```
File: <path>
Verdict: <pass count> / 12

C1: PASS | FAIL — <reason; quote violating text if FAIL>
C2: PASS | FAIL — ...
[all 12]

Recommended edits (one concrete OLD → NEW per failed criterion):
1. C2 fix: OLD: "Components should receive only primitive IDs as props"
   NEW: "Components MUST receive only primitive IDs as props. Anti-example: a component receiving `{ user: User }` instead of `{ userId: string }`."
2. ...
```

Mechanical, not narrative.

## Self-test gate — RUN BEFORE MASS DISPATCH

Apply this checklist to:

1. `auth/SKILL.md` — expected: at least **8 / 12** PASS.
2. `frontend-patterns/SKILL.md` — expected: at most **4 / 12** PASS.

If verdicts diverge from these expectations, the checklist is miscalibrated. Stop and rework.

## What this checklist is NOT

- Not a measurement of behavior change. The eval for behavior change is whether Claude's output improves in real sessions.
- Not a redesign of the instruction system. It's a review tool.
- Not enforcement. Recommendations are reviewed by the project owner before any edit ships.
