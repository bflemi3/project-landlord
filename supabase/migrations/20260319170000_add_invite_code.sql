-- Add invite code column for gated sign-up access
alter table invitations add column code text;

-- Unique index on code (only for non-null codes)
create unique index idx_invitations_code on invitations(code) where code is not null;

-- RPC function for validating invite codes — returns boolean only
-- No direct table access for anon users
create or replace function public.validate_invite_code(invite_code text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  _valid boolean;
begin
  select exists(
    select 1 from public.invitations
    where code = upper(trim(invite_code))
      and status = 'pending'
      and accepted_by is null
      and (expires_at is null or expires_at > now())
  ) into _valid;

  return _valid;
end;
$$;

-- Allow anon users to call the validation function
grant execute on function public.validate_invite_code(text) to anon;
