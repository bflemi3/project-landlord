-- Add invite-related fields to profiles
alter table profiles add column has_redeemed_invite boolean not null default false;
alter table profiles add column acquisition_channel text;

-- Update redeem_invite_code trigger to set profile fields
create or replace function public.redeem_invite_code()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _invite_code text;
  _user_meta jsonb;
  _invite_source text;
begin
  -- Get the user metadata from auth.users
  select raw_user_meta_data into _user_meta
  from auth.users
  where id = new.id;

  _invite_code := nullif(trim(_user_meta->>'invite_code'), '');

  if _invite_code is not null then
    -- Mark invitation as accepted and get the source
    update public.invitations
    set
      status = 'accepted',
      accepted_by = new.id,
      accepted_at = now(),
      updated_at = now()
    where code = upper(_invite_code)
      and status = 'pending'
      and accepted_by is null
      and (expires_at is null or expires_at > now())
    returning source into _invite_source;

    -- Only set invite fields if an invitation was actually redeemed
    if found then
      update public.profiles
      set
        has_redeemed_invite = true,
        acquisition_channel = _invite_source
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;
