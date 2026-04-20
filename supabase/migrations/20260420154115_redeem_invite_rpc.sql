-- =============================================================================
-- redeem_invite RPC
-- =============================================================================
-- Atomic invite redemption that runs with definer privileges.
--
-- Consolidates logic previously scattered across TS (redeemInviteByCodeCore),
-- a service-role admin call, and implicit RLS-policy checks. Replaces the
-- RLS-gated path that silently failed on tenant membership inserts and on
-- invite-email case mismatches.
--
-- Security:
--   - auth.uid() identifies the caller; the function cannot be used to redeem
--     on behalf of another user.
--   - invitation must match the caller's profile email (case-insensitive).
--   - grants execute only to `authenticated`.
--
-- Side effects (atomic, single transaction):
--   1. UPDATE invitations -> accepted
--   2. UPDATE profiles.has_redeemed_invite = true, acquisition_channel
--      (the sync_invite_redeemed_claim trigger propagates to auth.users.raw_app_meta_data)
--   3. INSERT membership if invite is tenant-role with property_id + unit_id
--      (idempotent: on conflict do nothing)
-- If any step raises, all roll back.

create or replace function public.redeem_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite record;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  if invite_code is null or length(trim(invite_code)) = 0 then
    return jsonb_build_object('success', false, 'reason', 'invalid_or_mismatch');
  end if;

  select lower(email) into v_user_email
  from public.profiles
  where id = v_user_id;

  if v_user_email is null then
    return jsonb_build_object('success', false, 'reason', 'profile_missing');
  end if;

  update public.invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where upper(trim(code)) = upper(trim(invite_code))
    and status = 'pending'
    and (expires_at is null or expires_at > now())
    and lower(invited_email) = v_user_email
  returning id, source, role, property_id, unit_id
  into v_invite;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid_or_mismatch');
  end if;

  update public.profiles
  set has_redeemed_invite = true,
      acquisition_channel = coalesce(acquisition_channel, v_invite.source)
  where id = v_user_id;

  if v_invite.role = 'tenant'
     and v_invite.property_id is not null
     and v_invite.unit_id is not null then
    insert into public.memberships (user_id, property_id, unit_id, role)
    values (v_user_id, v_invite.property_id, v_invite.unit_id, 'tenant')
    on conflict (user_id, property_id, unit_id) do nothing;
  end if;

  return jsonb_build_object('success', true, 'source', v_invite.source);
end;
$$;

revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

comment on function public.redeem_invite(text) is
  'Atomically redeems an invite code for the calling authenticated user. '
  'Uses auth.uid() for identity (cannot redeem on behalf of another user). '
  'Case-insensitive match on both code and email. Returns '
  'jsonb { success: bool, source?: text, reason?: text }.';

-- =============================================================================
-- Remove legacy redeem_invite_code function
-- =============================================================================
-- The trigger that called this function was dropped in migration 20260415120700.
-- The function body was kept "for reference" but now duplicates logic the new
-- RPC owns (with bugs: case-sensitive code match, no tenant membership insert).
-- Dropping it prevents accidental re-wiring that would reintroduce the silent
-- failures this migration fixes.
drop function if exists public.redeem_invite_code();

-- =============================================================================
-- BACKFILL: repair orphaned tenant memberships
-- =============================================================================
-- Before this migration, the TS-side redeemInviteByCodeCore attempted to insert
-- tenant memberships using the user's RLS-scoped client. RLS requires the
-- inserter to be a landlord of the property, so tenant redemption silently
-- failed at the membership step — the invitation flipped to 'accepted' and the
-- profile flag was set, but no membership row was ever created. LL property
-- pages show affected tenants as "pending" under invites.
--
-- This backfill inserts the missing memberships. Safe: additive only, guarded
-- by `on conflict do nothing` for the `(user_id, property_id, unit_id)` unique
-- constraint, and scoped to accepted tenant invitations with complete data.

insert into public.memberships (user_id, property_id, unit_id, role)
select
  i.accepted_by,
  i.property_id,
  i.unit_id,
  'tenant'
from public.invitations i
where i.status = 'accepted'
  and i.role = 'tenant'
  and i.accepted_by is not null
  and i.property_id is not null
  and i.unit_id is not null
on conflict (user_id, property_id, unit_id) do nothing;
