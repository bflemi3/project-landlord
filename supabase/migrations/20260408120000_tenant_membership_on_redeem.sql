-- Extend redeem_invite_code trigger to create a tenant membership
-- when the redeemed invitation is for a tenant with a property + unit.
create or replace function public.redeem_invite_code()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _invite_code text;
  _user_meta jsonb;
  _invite_source text;
  _invite_role text;
  _invite_property_id uuid;
  _invite_unit_id uuid;
begin
  -- Get the user metadata from auth.users
  select raw_user_meta_data into _user_meta
  from auth.users
  where id = new.id;

  _invite_code := nullif(trim(_user_meta->>'invite_code'), '');

  if _invite_code is not null then
    -- Mark invitation as accepted and get context
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
    returning source, role, property_id, unit_id
      into _invite_source, _invite_role, _invite_property_id, _invite_unit_id;

    -- Only proceed if an invitation was actually redeemed
    if found then
      -- Set invite fields on profile
      update public.profiles
      set
        has_redeemed_invite = true,
        acquisition_channel = _invite_source
      where id = new.id;

      -- Create tenant membership if this is a tenant invite with property + unit
      if _invite_role = 'tenant' and _invite_property_id is not null and _invite_unit_id is not null then
        insert into public.memberships (user_id, property_id, unit_id, role)
        values (new.id, _invite_property_id, _invite_unit_id, 'tenant')
        on conflict (user_id, property_id, unit_id) do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;
