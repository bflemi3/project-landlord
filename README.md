# Mabenn

Rental management for small Brazilian landlords and their tenants — the structure and visibility of a property manager, without the 8–12% fee.

## What it does

Mabenn does the work a property manager charges 8–12% for — without the manager. It watches both sides' bank accounts to confirm rent and bills as they're paid, finds new bills the day they're issued, manages the contract from drafting through renewal, and rolls everything up into a clear picture of how much a landlord is earning. The rental conversation lives next to the rental it's about, both sides build a portable reputation, and an assistant trained on Brazilian rental law answers everyday questions. Money never moves through Mabenn — it observes payments, it doesn't intermediate — and it runs in the background, surfacing only when something needs attention.

### For landlords

- See rent and bills confirmed automatically from connected bank accounts (Open Finance) — on both sides of the rental
- Discover new boletos the day they're issued (DDA) and ingest utility bills through a per-property email address
- Track revenue — monthly, year-to-date, lifetime, per property, and per contract
- Draft contracts from Brazilian templates and track the lifecycle: IPCA adjustments, renewals, and expirations
- Get reminders only when something needs you — a new bill, an adjustment to approve, a late payment, a renewal window
- Generate the late-payment notices the Lei do Inquilinato requires
- Build a portable, event-driven reputation from real payment history

### For tenants

- Connect a bank account and stop having to prove payments — every rent and bill is timestamped
- See the same live billing view, ledger, and contract as the landlord
- Understand where each charge came from and preview source documents when available
- Dispute questionable charges with the source document in view
- Carry a verified, bank-confirmed payment record to any future landlord

### For both sides

- Ask an assistant trained on the Lei do Inquilinato and your specific contract — both sides get the same answer (for complex disputes, a lawyer is still the right call)
- Keep maintenance requests, contract questions, negotiations, and disputes in one record, tied to the rental

### For shared households

- Invite additional tenants onto a rental — each connects their own bank, with bill shares and reputation tracked per person
- Co-owned properties are supported — multiple landlords, each with their own login and equal visibility

## Documentation

Browse the project documentation, wireframes, and journey walkthroughs at [bflemi3.github.io/project-landlord](https://bflemi3.github.io/project-landlord/)

## Tech stack

- **Framework:** Next.js (App Router)
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security) — hosted in `sa-east-1` (São Paulo)
- **Payment detection:** Open Finance (Pluggy/Belvo)
- **Bill discovery:** DDA (Celcoin) for boletos; email ingestion for utility bills
- **Email:** Resend
- **Styling:** Tailwind CSS + shadcn/ui
- **Analytics:** PostHog
- **Deployment:** Progressive Web App (PWA)

## Localization

Supports English, Brazilian Portuguese, and Spanish.

## License

Private — all rights reserved.
