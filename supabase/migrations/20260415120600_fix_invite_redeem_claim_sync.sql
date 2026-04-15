-- Fix: redeem_invite_code trigger must sync has_redeemed_invite to JWT claims
-- directly, because the nested trigger chain (INSERT profile → redeem invite →
-- UPDATE profile → sync claim) doesn't reliably fire the sync trigger when
-- running inside the auth.users INSERT transaction.

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

      -- Sync directly to JWT claims (don't rely on nested trigger)
      update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || '{"has_redeemed_invite": true}'::jsonb
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;
