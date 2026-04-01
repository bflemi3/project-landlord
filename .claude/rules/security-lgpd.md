# Security and LGPD Compliance

This product handles sensitive billing, financial, and personal data (CPF, addresses, payment records, uploaded documents). Comply with Brazil's LGPD from day one.

## Required

- Row Level Security on all property-scoped and user-scoped data
- Role-aware access control
- Secure document storage
- Audit trail for sensitive changes
- Explicit revision tracking for statements
- Data minimization — collect only what billing requires
- Supabase project hosted in `sa-east-1` (São Paulo)

## Never do this

- Expose cross-property data accidentally
- Trust client-only authorization
- Allow silent mutation of published financial records
- Treat extracted document data as inherently correct
- Store money as floating point values
- Collect personal data beyond what billing requires
- Process personal data without a valid legal basis
- Transfer data internationally without documented safeguards

## LGPD Legal Basis

- **Contract performance** (Art. 7, V) — core billing data
- **Legitimate interest** (Art. 7, IX) — product analytics (PostHog), usage metrics. Requires documented LIA
- **Explicit consent** (Art. 7, I) — only for marketing emails or third-party data sharing

## User Rights (Art. 18)

All requests answered within **15 days**. Support: confirmation/access, correction, deletion ("Delete my account" with proper cascade), portability (JSON/CSV export), consent revocation, information about sharing, right to complain to ANPD.

## Data Retention

| Data type | Retention |
|---|---|
| Active account data | Account duration + 30 days |
| Published statements | 5 years |
| Payment records | 5 years |
| Uploaded bills/documents | Tenancy + 1 year or 5 years (whichever longer) |
| Analytics events | 2 years, then anonymize |
| Deleted account data | Delete within 30 days (except legally required) |
| Audit logs | 5 years |

## Privacy Policy

Publish at `/privacidade` in Portuguese (minimum). Must include: controller identity, privacy contact email, data collected, purpose/legal basis per category, third-party processors (Supabase, PostHog, Vercel, Resend), international transfers + safeguards, retention periods, user rights, cookie/tracking disclosure, ANPD complaint right.

## Analytics Tracking

- Public pages: anonymous tracking under legitimate interest
- Authenticated app: identified tracking under legitimate interest with opt-out toggle
- Do not track identified users before sign-up

## Data Breach

Notify ANPD within 2 business days. Notify affected users in same timeframe. Have incident response plan before launch.

## International Transfers

Supabase in `sa-east-1`. Vercel, PostHog, Resend: ensure DPAs with Standard Contractual Clauses.

## Upload Restrictions

ToS must specify only billing-related documents may be uploaded. No health, biometric, or LGPD Art. 5 II sensitive categories.
