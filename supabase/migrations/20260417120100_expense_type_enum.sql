-- Add expense_type enum for contract extraction.
--
-- The contract extraction engine canonicalizes recurring contract expenses
-- (utilities, condo fees, etc.) to a shared English vocabulary across
-- languages. PT-BR "luz"/"energia elétrica", ES "energía eléctrica", EN
-- "electricity" all map to type "electricity". This keeps downstream
-- consumers (billing, payment matching, ledger, analytics, UI) free from
-- per-language synonym handling.
--
-- Making this a Postgres enum keeps the DB as the source of truth for the
-- allowed values; the Zod schema and TypeScript types derive from here.
-- "other" is the escape hatch for expenses that don't fit a known category
-- (e.g., IPTU, IBI, predial, security fees, pool fees) — contracts still
-- record the expense, but downstream code doesn't need to know about every
-- obscure category.
--
-- Additive and non-destructive — no tables use this enum yet.

create type expense_type as enum (
  'electricity',
  'water',
  'gas',
  'internet',
  'condo',
  'trash',
  'sewer',
  'cable',
  'maintenance',
  'other'
);
