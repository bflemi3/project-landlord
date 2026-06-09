-- =============================================================================
-- Bank accounts (Pluggy / Open Finance) — PRO-61
-- =============================================================================
-- First persistence surface for bank connections. Used by both landlords and
-- tenants; scope is per-user (a Pluggy "item" represents one consent of one
-- user with one institution, and it serves every rental that user participates
-- in). Lifecycle states live on bank_items; individual accounts are children.
--
-- No raw credentials are stored — Pluggy holds those. We persist only the
-- Pluggy item id, institution metadata, masked account info, and lifecycle.
-- See .claude/rules/security-lgpd.md.
--
-- Writes go through SECURITY DEFINER RPCs (register_bank_item /
-- disconnect_bank_item) — RLS only permits SELECT for the owning user.
-- (See .claude/skills/auth/SKILL.md invariant 7.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum
-- -----------------------------------------------------------------------------
create type bank_item_status as enum (
  'connected',
  'reconnect_required',
  'disconnected'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table bank_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  pluggy_item_id    text not null,
  institution_id    text not null,
  institution_name  text not null,
  status            bank_item_status not null default 'connected',
  connected_at      timestamptz not null default now(),
  disconnected_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table bank_items is
  'One Pluggy consent per row. Lifecycle is connected → reconnect_required → '
  'disconnected (soft delete via disconnected_at + status). RLS allows the '
  'owning user to SELECT; writes go through SECURITY DEFINER RPCs.';

create index idx_bank_items_user_id on bank_items(user_id);

-- At-most-one active item per (user, pluggy_item_id). Allows historic
-- reconnections to coexist as disconnected rows.
create unique index uq_bank_items_user_pluggy_item_active
  on bank_items (user_id, pluggy_item_id)
  where disconnected_at is null;

create table bank_accounts (
  id                 uuid primary key default gen_random_uuid(),
  bank_item_id       uuid not null references bank_items(id) on delete cascade,
  user_id            uuid not null references profiles(id) on delete cascade,
  pluggy_account_id  text not null,
  account_type       text not null,
  account_subtype    text,
  name               text not null,
  masked_number      text,
  currency_code      text not null default 'BRL',
  created_at         timestamptz not null default now()
);

comment on table bank_accounts is
  'One row per Pluggy account inside a bank_item. user_id is denormalized '
  'from bank_items.user_id for efficient RLS without a join. masked_number '
  'is e.g. "****1234" — we never store full account numbers.';

create index idx_bank_accounts_bank_item_id on bank_accounts(bank_item_id);
create index idx_bank_accounts_user_id      on bank_accounts(user_id);

create unique index uq_bank_accounts_item_pluggy_account
  on bank_accounts (bank_item_id, pluggy_account_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger (the foundation migration's do-block ran before this
-- table existed; attach it here per the contracts/rent precedent).
-- -----------------------------------------------------------------------------
create trigger set_updated_at
  before update on bank_items
  for each row execute function update_updated_at();

-- -----------------------------------------------------------------------------
-- Audit triggers (convention: audit_<table>; see 20260510120800)
-- -----------------------------------------------------------------------------
create trigger audit_bank_items
  after insert or update or delete on bank_items
  for each row execute function audit_log_trigger();

create trigger audit_bank_accounts
  after insert or update or delete on bank_accounts
  for each row execute function audit_log_trigger();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Bank data is particularly sensitive (see .claude/skills/data-modeling/SKILL.md
-- "RLS Posture"). Only the owning user can read; mutations go through SECURITY
-- DEFINER RPCs (no insert/update/delete policies).
-- -----------------------------------------------------------------------------
alter table bank_items    enable row level security;
alter table bank_accounts enable row level security;

create policy "bank_items: owner select"
  on bank_items for select using (user_id = auth.uid());

create policy "bank_accounts: owner select"
  on bank_accounts for select using (user_id = auth.uid());

-- =============================================================================
-- register_bank_item RPC
-- =============================================================================
-- Atomic upsert: inserts one bank_items row + N bank_accounts rows for the
-- calling authenticated user. Used by the registerPluggyItem server action
-- after Pluggy Connect succeeds on the client.
--
-- p_accounts is a JSON array of:
--   { pluggy_account_id, account_type, account_subtype?,
--     name, masked_number?, currency_code? }
--
-- Returns jsonb { success: bool, bank_item_id?: uuid, reason?: text }.
-- Idempotent: if (user_id, pluggy_item_id) already has an active row, returns
-- success with the existing bank_item_id (no duplicate insert, no duplicate
-- accounts).
-- =============================================================================

create or replace function public.register_bank_item(
  p_pluggy_item_id   text,
  p_institution_id   text,
  p_institution_name text,
  p_accounts         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id      uuid := auth.uid();
  v_bank_item_id uuid;
  v_account      jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  if p_pluggy_item_id is null or length(trim(p_pluggy_item_id)) = 0
     or p_institution_id is null or length(trim(p_institution_id)) = 0
     or p_institution_name is null or length(trim(p_institution_name)) = 0 then
    return jsonb_build_object('success', false, 'reason', 'invalid_input');
  end if;

  -- Idempotent upsert on (user_id, pluggy_item_id) where disconnected_at is null.
  select id into v_bank_item_id
  from public.bank_items
  where user_id = v_user_id
    and pluggy_item_id = p_pluggy_item_id
    and disconnected_at is null;

  if v_bank_item_id is null then
    insert into public.bank_items (
      user_id, pluggy_item_id, institution_id, institution_name, status
    )
    values (
      v_user_id, p_pluggy_item_id, p_institution_id, p_institution_name, 'connected'
    )
    returning id into v_bank_item_id;
  else
    -- Reconnect path: caller is re-registering an item that was previously
    -- flagged reconnect_required. Flip status back to connected.
    update public.bank_items
    set status = 'connected',
        institution_id = p_institution_id,
        institution_name = p_institution_name
    where id = v_bank_item_id;
  end if;

  -- Insert child accounts. On conflict (bank_item_id, pluggy_account_id) do
  -- nothing — protects the idempotent replay path.
  if p_accounts is not null and jsonb_typeof(p_accounts) = 'array' then
    for v_account in select jsonb_array_elements(p_accounts) loop
      insert into public.bank_accounts (
        bank_item_id, user_id,
        pluggy_account_id, account_type, account_subtype,
        name, masked_number, currency_code
      )
      values (
        v_bank_item_id, v_user_id,
        v_account ->> 'pluggy_account_id',
        v_account ->> 'account_type',
        nullif(v_account ->> 'account_subtype', ''),
        v_account ->> 'name',
        nullif(v_account ->> 'masked_number', ''),
        coalesce(nullif(v_account ->> 'currency_code', ''), 'BRL')
      )
      on conflict (bank_item_id, pluggy_account_id) do nothing;
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'bank_item_id', v_bank_item_id
  );
end;
$$;

revoke all on function public.register_bank_item(text, text, text, jsonb) from public, anon;
grant execute on function public.register_bank_item(text, text, text, jsonb) to authenticated;

comment on function public.register_bank_item(text, text, text, jsonb) is
  'Atomically registers a Pluggy item + its accounts for the calling user. '
  'Idempotent on (user_id, pluggy_item_id). Returns '
  'jsonb { success: bool, bank_item_id?: uuid, reason?: text }.';

-- =============================================================================
-- disconnect_bank_item RPC
-- =============================================================================
-- Soft-disconnects an item owned by the calling user. Future syncs stop
-- because status = 'disconnected' and the unique active index releases.
-- Returns jsonb { success: bool, pluggy_item_id?: text, reason?: text }.
-- The pluggy_item_id is returned so the server action can fire a best-effort
-- DELETE against the Pluggy API after the RPC commits.
-- =============================================================================

create or replace function public.disconnect_bank_item(
  p_bank_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id        uuid := auth.uid();
  v_pluggy_item_id text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  if p_bank_item_id is null then
    return jsonb_build_object('success', false, 'reason', 'invalid_input');
  end if;

  update public.bank_items
  set status = 'disconnected',
      disconnected_at = now()
  where id = p_bank_item_id
    and user_id = v_user_id
    and disconnected_at is null
  returning pluggy_item_id into v_pluggy_item_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'success', true,
    'pluggy_item_id', v_pluggy_item_id
  );
end;
$$;

revoke all on function public.disconnect_bank_item(uuid) from public, anon;
grant execute on function public.disconnect_bank_item(uuid) to authenticated;

comment on function public.disconnect_bank_item(uuid) is
  'Soft-disconnects a bank_item owned by the calling user. Returns '
  'jsonb { success: bool, pluggy_item_id?: text, reason?: text }. The '
  'pluggy_item_id lets the caller fire a best-effort DELETE against Pluggy.';
