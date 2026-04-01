---
name: email-templates
description: Email template architecture, conventions, and delivery patterns. Use when working on email templates or the send-email Edge Function.
paths:
  - "src/emails/**"
  - "supabase/functions/send-email/**"
---

# Email Templates & Delivery

## Architecture

Two locations based on runtime:

- **`src/emails/`** — Next.js templates (Node.js). App-triggered emails: waitlist, invite codes, notifications. Preview copies of auth templates. Run `pnpm email` → `localhost:3333`.
- **`supabase/functions/send-email/templates.ts`** — Edge Function templates (Deno). Auth-triggered emails: confirmation, password reset. HTML string builders (not React) to avoid cold start issues.

When updating auth email designs: update preview in `src/emails/` first, then sync HTML to string builders.

## Technology

- React Email (`@react-email/components`) + `@react-email/tailwind`
- Resend for delivery (sending + receiving on `mabenn.com`)
- Supabase Auth Hook (`send_email`) intercepts auth emails → Resend

## Conventions

- Force light mode only (`color-scheme: light only`)
- PNG for images (SVG unsupported in Gmail/Outlook)
- Edge Function: HTML string builders only — keep cold starts under 5s
- Button: `display: block` full-width via `<Section>` wrapper
- All templates: EN, PT-BR, ES via locale prop
- From: `mabenn <noreply@mabenn.com>`

## Reply-to Policy

- **Conversational** (invite, waitlist welcome): `replyTo: hello@mabenn.com`
- **Transactional** (confirmation, reset, notifications): no reply-to

## i18n

- `src/emails/i18n.ts` — app-triggered translations
- `supabase/functions/send-email/i18n.ts` — auth-triggered translations
- Footer tagline duplicated in both — keep in sync manually

## Edge Function Details

- Strip `v1,whsec_` prefix from `SEND_EMAIL_HOOK_SECRET` before `Webhook` constructor
- Deploy with `verify_jwt: false` (auth hook has no JWT; security via webhook signature)
- Queries user's `preferred_locale` from profiles table
- Deploy via MCP (`mcp__supabase__deploy_edge_function`) to ensure `verify_jwt: false` persists
