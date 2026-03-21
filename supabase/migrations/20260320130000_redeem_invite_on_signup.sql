-- =============================================================================
-- REDEEM INVITE CODE WHEN USER SIGNS UP
-- =============================================================================
-- After a profile is created, check if the user's metadata contains an
-- invite_code. If so, mark the invitation as accepted.
-- Uses accepted_by IS NULL in the WHERE clause to prevent race conditions
-- where two users try to redeem the same code simultaneously.
-- =============================================================================

create or replace function public.redeem_invite_code()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _invite_code text;
  _user_meta jsonb;
begin
  -- Get the user metadata from auth.users
  select raw_user_meta_data into _user_meta
  from auth.users
  where id = new.id;

  _invite_code := nullif(trim(_user_meta->>'invite_code'), '');

  if _invite_code is not null then
    update public.invitations
    set
      status = 'accepted',
      accepted_by = new.id,
      accepted_at = now(),
      updated_at = now()
    where code = upper(_invite_code)
      and status = 'pending'
      and accepted_by is null
      and (expires_at is null or expires_at > now());
  end if;

  return new;
end;
$$;

create trigger on_profile_created_redeem_invite
  after insert on public.profiles
  for each row execute function public.redeem_invite_code();

-- Partial unique index: only one user can accept a given invite code
create unique index idx_invitations_accepted_by_code
  on invitations(code) where status = 'accepted';
