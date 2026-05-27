-- =============================================================================
-- Marketing waitlist capture.
--
-- Stores pre-auth waitlist signups (landlord or tenant) from the public landing
-- page. Source of truth for waitlist size by role; Resend handles the emails.
--
-- The landing form is unauthenticated, so inserts go through a SECURITY DEFINER
-- RPC (join_waitlist) granted to anon — never a service-role call from TS
-- (auth/SKILL.md invariant 7). RLS is enabled with no policies: the table is not
-- directly readable/writable by anon or authenticated; all writes flow through
-- the RPC.
-- =============================================================================

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null default 'landlord' check (role in ('landlord', 'tenant')),
  locale     text not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Idempotent insert from the public form. First signup wins on email conflict.
create or replace function public.join_waitlist(
  p_email  text,
  p_role   text default 'landlord',
  p_locale text default 'en'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.waitlist (email, role, locale)
  values (
    lower(trim(p_email)),
    case when p_role in ('landlord', 'tenant') then p_role else 'landlord' end,
    p_locale
  )
  on conflict (email) do nothing;
end;
$$;

grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;
