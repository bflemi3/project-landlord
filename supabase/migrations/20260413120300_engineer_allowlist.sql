-- =============================================================================
-- Engineer allowlist for /eng/ routes
-- Middleware checks this table (via service role) to gate access.
-- Engineers manage rows directly in the DB — no UI needed.
-- =============================================================================

create table engineer_allowlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,            -- denormalized for readability when inserting manually
  created_at timestamptz not null default now()
);

-- Server-side only (middleware uses service role to bypass RLS)
alter table engineer_allowlist enable row level security;
