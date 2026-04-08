-- RPC to validate an invite code and return context for the sign-up page.
-- Returns NULL if invalid/expired/accepted, or a row with context if valid.
-- Security definer so it works for unauthenticated users on the sign-up page.
create or replace function public.validate_invite_with_context(invite_code text)
returns table (
  code text,
  invited_email text,
  invited_name text,
  property_name text,
  is_expired boolean
)
language plpgsql
security definer set search_path = ''
as $$
declare
  _invite record;
begin
  select i.code, i.invited_email, i.invited_name, i.property_id, i.expires_at
  into _invite
  from public.invitations i
  where i.code = upper(trim(invite_code))
    and i.status = 'pending'
    and i.accepted_by is null
  limit 1;

  -- No matching pending invitation
  if not found then
    return;
  end if;

  -- Check expiration — return a row with is_expired = true so caller can distinguish
  if _invite.expires_at is not null and _invite.expires_at <= now() then
    return query select
      _invite.code,
      _invite.invited_email,
      _invite.invited_name,
      null::text,
      true;
    return;
  end if;

  -- Valid — fetch property name if available
  return query select
    _invite.code,
    _invite.invited_email,
    _invite.invited_name,
    p.name,
    false
  from (select 1) as dummy
  left join public.properties p on p.id = _invite.property_id;
end;
$$;

-- Allow anon users to call (sign-up page is pre-auth)
grant execute on function public.validate_invite_with_context(text) to anon;
