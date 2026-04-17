-- Add property_type enum for contract extraction.
--
-- The contract extraction engine classifies properties into one of four
-- types based on the contract description (e.g., Brazilian "apartamento"
-- → apartment, "casa/sobrado" → house, "sala comercial/loja" → commercial).
-- Making this a Postgres enum keeps the DB as the source of truth for the
-- allowed values; the Zod schema and TypeScript types derive from here.
--
-- Additive and non-destructive — no tables use this enum yet.

create type property_type as enum ('apartment', 'house', 'commercial', 'other');
