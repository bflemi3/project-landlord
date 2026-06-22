-- =============================================================================
-- Payment matching foundation — PRO-61
-- =============================================================================
-- Three post-pivot tables (Decision 1 in
-- docs/project/decisions-PRO-61-bank-account-and-payment-matching.md):
--
--   monthly_ledger      — one row per (rent, month). The running ledger.
--   bank_transactions   — Pluggy-sourced raw transaction history. Strict RLS.
--   payment_matches     — reversible link between a bank_transaction and a
--                         monthly_ledger entry.
--
-- Plus three SECURITY DEFINER RPCs:
--
--   generate_rent_ledger_entries(p_rent_id) — eager ledger generation
--   apply_pluggy_transaction(p_bank_account_id, p_transaction) — webhook entry
--   unmatch_payment(p_payment_match_id, p_reason) — reversal
--
-- And an AFTER INSERT trigger on `rent` that calls the generator, so every
-- code path that inserts rent populates the ledger.
--
-- Notes:
--   • Money: amount_minor + currency. No floats. (data-modeling skill.)
--   • Match window: amount-exact + |posted_at − due_date| ≤ 10 days. (Decision 4.)
--   • One match flips both sides immediately; source_side records which feed
--     produced it. (Decision 5.)
--   • Matches are reversible (Decision 9): unmatch flips ledger back, retains
--     the match row with reversed_at set.
--   • bank_transactions RLS: only the connecting user reads their own raw data
--     (Decision 10).
--   • Audit triggers on all three tables (Decision 11).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Extensible. Condo / utility kinds will be added by a future migration when
-- their generators land. For PRO-61 only 'rent' is meaningful.
create type monthly_ledger_kind as enum ('rent');

create type monthly_ledger_status as enum ('open', 'paid', 'overdue');

-- Which side's bank feed produced the match. Future confirming-match rows
-- from the other side are recorded but don't re-mark the ledger (Decision 5).
create type payment_match_source_side as enum ('landlord', 'tenant');

-- -----------------------------------------------------------------------------
-- monthly_ledger
-- -----------------------------------------------------------------------------
create table monthly_ledger (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references units(id) on delete cascade,
  -- Nullable so a future non-rent ledger row (e.g. condo) can omit it.
  rent_id           uuid references rent(id) on delete set null,
  kind              monthly_ledger_kind not null,
  -- Per data-modeling: charge ownership is per-charge, not per-property.
  bill_holder       user_role not null,
  period_year       integer not null,
  period_month      integer not null check (period_month between 1 and 12),
  due_date          date not null,
  amount_minor      integer not null check (amount_minor >= 0),
  currency          text not null,
  status            monthly_ledger_status not null default 'open',
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table monthly_ledger is
  'Running ledger of monthly obligations. Replaces the legacy statements / '
  'charge_instances flow for new code. A paid row IS the revenue event for '
  'the landlord and the paid event for the tenant — same row, two readings '
  '(Decision 8). Past months are immutable in product semantics; corrections '
  'are recorded as new rows or via reversible payment_matches.';

comment on column monthly_ledger.bill_holder is
  'Which side holds the bill — drives which bank feed the matcher watches.';

-- Prevent duplicate rent rows for the same (rent, month). Partial so a
-- future non-rent row (rent_id is null) is permitted.
create unique index uq_monthly_ledger_rent_period
  on monthly_ledger (rent_id, period_year, period_month)
  where rent_id is not null;

create index idx_monthly_ledger_unit_id      on monthly_ledger(unit_id);
-- Matcher hot path: open rows ordered by due_date.
create index idx_monthly_ledger_status_due   on monthly_ledger(status, due_date);

-- -----------------------------------------------------------------------------
-- bank_transactions
-- -----------------------------------------------------------------------------
create table bank_transactions (
  id                     uuid primary key default gen_random_uuid(),
  bank_account_id        uuid not null references bank_accounts(id) on delete cascade,
  -- Denormalized for RLS without a join; mirrors bank_accounts.user_id.
  user_id                uuid not null references profiles(id) on delete cascade,
  pluggy_transaction_id  text not null,
  posted_at              timestamptz not null,
  -- Signed: positive = credit (money in), negative = debit (money out).
  amount_minor           integer not null,
  currency               text not null,
  description            text,
  counterparty_cpf       text,
  counterparty_name      text,
  -- Full Pluggy payload retained for audit / debug / future matcher cues.
  raw                    jsonb not null,
  created_at             timestamptz not null default now()
);

comment on table bank_transactions is
  'Pluggy-sourced bank transaction history. Strict RLS — only the connecting '
  'user reads their own rows (Decision 10). The counterparty sees the derived '
  'monthly_ledger row, never the raw bank data. Writes happen only from the '
  'Pluggy webhook via the apply_pluggy_transaction SECURITY DEFINER RPC.';

create unique index uq_bank_transactions_account_pluggy_id
  on bank_transactions (bank_account_id, pluggy_transaction_id);

create index idx_bank_transactions_user_id      on bank_transactions(user_id);
create index idx_bank_transactions_account_posted
  on bank_transactions(bank_account_id, posted_at desc);

-- -----------------------------------------------------------------------------
-- payment_matches
-- -----------------------------------------------------------------------------
create table payment_matches (
  id                    uuid primary key default gen_random_uuid(),
  monthly_ledger_id     uuid not null references monthly_ledger(id) on delete restrict,
  bank_transaction_id   uuid not null references bank_transactions(id) on delete restrict,
  matched_at            timestamptz not null default now(),
  -- Null = system match. Populated when a human manually confirms / re-matches.
  -- ON DELETE SET NULL: deleting a user nullifies who-acted but retains the
  -- audited match (a payment record, 5-year retention per security-lgpd). The
  -- actor columns carry no PII, so nullifying is the correct erasure behavior.
  matched_by            uuid references profiles(id) on delete set null,
  source_side           payment_match_source_side not null,
  reversed_at           timestamptz,
  reversed_by           uuid references profiles(id) on delete set null,
  reversal_reason       text
);

-- LGPD erasure path (account deletion, not yet built — decision recorded here so
-- the schema is laid down deliberately):
--   • payment_matches and monthly_ledger are payment records (5-year retention)
--     and must survive account deletion — hence monthly_ledger_id /
--     bank_transaction_id stay ON DELETE RESTRICT (protect the financial record)
--     and the actor columns above are SET NULL (retain match, drop the actor).
--   • bank_transactions holds the PII (counterparty CPF/name, raw payload) AND
--     backs the payment record. user_id is deliberately LEFT as ON DELETE
--     CASCADE for now: combined with the RESTRICT above, deleting a profile that
--     has any matched payment FAILS LOUDLY rather than silently orphaning PII.
--     The account-deletion pipeline must ANONYMIZE bank_transactions in place
--     (null the PII columns, scrub raw) and RETAIN the row, so the 5-year
--     payment record stays intact. Flipping user_id to SET NULL before that
--     pipeline exists would turn the loud failure into silent incomplete
--     erasure — worse under LGPD. Revisit this FK when building deletion.

comment on table payment_matches is
  'Reversible link between a bank_transaction and a monthly_ledger entry. '
  'A non-null reversed_at means the match was undone — the row is retained '
  'so the trail is preserved (Decision 9).';

-- At most one active match per ledger entry.
create unique index uq_payment_matches_ledger_active
  on payment_matches (monthly_ledger_id)
  where reversed_at is null;

create index idx_payment_matches_bank_tx     on payment_matches(bank_transaction_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at
  before update on monthly_ledger
  for each row execute function update_updated_at();

create trigger audit_monthly_ledger
  after insert or update or delete on monthly_ledger
  for each row execute function audit_log_trigger();

create trigger audit_bank_transactions
  after insert or update or delete on bank_transactions
  for each row execute function audit_log_trigger();

create trigger audit_payment_matches
  after insert or update or delete on payment_matches
  for each row execute function audit_log_trigger();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table monthly_ledger     enable row level security;
alter table bank_transactions  enable row level security;
alter table payment_matches    enable row level security;

-- monthly_ledger: unit members (landlord + tenant) see the same row.
create policy "monthly_ledger: unit members can select"
  on monthly_ledger for select
  using (is_unit_member(unit_id));

-- bank_transactions: only the connecting user. No write policies — service
-- role writes via the SECURITY DEFINER RPC.
create policy "bank_transactions: owner select"
  on bank_transactions for select
  using (user_id = auth.uid());

-- payment_matches: readable by anyone who can read the linked ledger row
-- (effectively the unit members). No write policies — SECURITY DEFINER only.
create policy "payment_matches: visible when ledger is visible"
  on payment_matches for select
  using (
    exists (
      select 1 from monthly_ledger ml
      where ml.id = monthly_ledger_id
        and is_unit_member(ml.unit_id)
    )
  );

-- =============================================================================
-- generate_rent_ledger_entries(p_rent_id uuid) returns jsonb
-- =============================================================================
-- Generates the monthly_ledger rows for a given rent. Walks months from
-- rent.start_date (or current_date if null) through rent.end_date
-- (or start_date + 24 months if null — Decision 2 edge case).
--
-- For each month, due_date = make_date(year, month,
--   least(rent.due_day_of_month, last_day_of_month))  — clamps day-31 for Feb.
--
-- Idempotent: ON CONFLICT DO NOTHING on (rent_id, year, month). Safe to call
-- repeatedly; backfill DO-block at the end of this migration relies on it.
-- =============================================================================
create or replace function generate_rent_ledger_entries(p_rent_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rent      record;
  v_start     date;
  v_end       date;
  v_generated integer := 0;
begin
  select id, unit_id, amount_minor, currency, due_day_of_month,
         start_date, end_date
    into v_rent
    from rent
   where id = p_rent_id
     and deleted_at is null;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  v_start := coalesce(v_rent.start_date, current_date);
  -- Open-ended contracts: 24 months from start. (Cron PR tops up later.)
  v_end   := coalesce(
              v_rent.end_date,
              (v_start + interval '24 months' - interval '1 day')::date
            );

  if v_start > v_end then
    return jsonb_build_object('success', true, 'generated', 0);
  end if;

  with months as (
    select
      extract(year  from m)::int as y,
      extract(month from m)::int as mo,
      -- Last day of this month, for due-day clamping.
      (date_trunc('month', m) + interval '1 month - 1 day')::date as last_day
    from generate_series(
           date_trunc('month', v_start::timestamp),
           date_trunc('month', v_end::timestamp),
           interval '1 month'
         ) as m
  )
  insert into monthly_ledger (
    unit_id, rent_id, kind, bill_holder,
    period_year, period_month, due_date,
    amount_minor, currency, status
  )
  select
    v_rent.unit_id, p_rent_id,
    'rent'::monthly_ledger_kind,
    'tenant'::user_role,
    y, mo,
    make_date(y, mo, least(v_rent.due_day_of_month, extract(day from last_day)::int)),
    v_rent.amount_minor, v_rent.currency,
    'open'::monthly_ledger_status
  from months
  on conflict (rent_id, period_year, period_month)
    where rent_id is not null
    do nothing;

  get diagnostics v_generated = row_count;
  return jsonb_build_object('success', true, 'generated', v_generated);
end;
$$;

-- Service-role only. The function is SECURITY DEFINER with no membership check
-- and takes an arbitrary p_rent_id, so an authenticated grant would let any
-- user materialize ledger rows on a property they don't belong to. The rent
-- AFTER INSERT trigger calls it as definer (so the trigger path is unaffected),
-- and the future cron job runs as service_role. No client code calls it.
revoke all on function generate_rent_ledger_entries(uuid) from public, anon, authenticated;
grant execute on function generate_rent_ledger_entries(uuid) to service_role;

comment on function generate_rent_ledger_entries(uuid) is
  'Generates monthly_ledger rows for a rent. Idempotent. Service-role only; '
  'called by the rent AFTER INSERT trigger (as definer) and a future cron job.';

-- AFTER INSERT trigger on rent — every code path that inserts a rent row
-- gets the ledger populated automatically. The trigger fn is a thin wrapper
-- so the underlying SECURITY DEFINER function can also be called directly.
create or replace function generate_rent_ledger_entries_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform generate_rent_ledger_entries(NEW.id);
  return NEW;
end;
$$;

create trigger generate_rent_ledger_after_insert
  after insert on rent
  for each row execute function generate_rent_ledger_entries_trigger();

-- =============================================================================
-- apply_pluggy_transaction(p_bank_account_id uuid, p_transaction jsonb)
-- =============================================================================
-- Webhook entry point. Service-role only (no authenticated grant).
--
-- Steps:
--   1. Validate inputs; resolve the connecting user from the bank_account.
--   2. Upsert the bank_transactions row. A new row inserts; a redelivery whose
--      amount/date/currency changed (PENDING -> settled) updates in place; an
--      unchanged replay is suppressed and short-circuits as a duplicate. If the
--      row already holds an active match, short-circuit (already_matched) so a
--      settled update doesn't disturb a confirmed match.
--   3. If credit (amount_minor > 0) and unmatched, find candidate ledger rows:
--        kind='rent', bill_holder='tenant', status='open',
--        currency = tx.currency, amount_minor = tx.amount,
--        |due_date - posted_at::date| <= 10 days,
--        AND the ledger's unit belongs to a property where the bank account's
--        user_id is a (non-deleted) landlord.
--   4. Exactly-one candidate → write payment_matches (source_side='landlord'),
--      flip ledger to 'paid', set paid_at = posted_at.
--      Zero or >1 candidates → no match (recoverable later).
--
-- Returns: jsonb { success: bool, matched: bool, ledger_id?: uuid,
--                  match_id?: uuid, reason?: text }
-- =============================================================================
create or replace function apply_pluggy_transaction(
  p_bank_account_id uuid,
  p_transaction     jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_landlord_id         uuid;
  v_pluggy_tx_id        text;
  v_posted_at           timestamptz;
  v_amount              integer;
  v_currency            text;
  v_description         text;
  v_counterparty_cpf    text;
  v_counterparty_name   text;
  v_bank_transaction_id uuid;
  v_candidate_count     integer;
  v_ledger_id           uuid;
  v_match_id            uuid;
begin
  if p_bank_account_id is null or p_transaction is null then
    return jsonb_build_object('success', false, 'reason', 'invalid_input');
  end if;

  v_pluggy_tx_id      := p_transaction ->> 'id';
  v_posted_at         := (p_transaction ->> 'date')::timestamptz;
  v_amount            := (p_transaction ->> 'amount_minor')::integer;
  v_currency          := p_transaction ->> 'currency';
  v_description       := p_transaction ->> 'description';
  v_counterparty_cpf  := nullif(p_transaction ->> 'counterparty_cpf', '');
  v_counterparty_name := nullif(p_transaction ->> 'counterparty_name', '');

  if v_pluggy_tx_id is null or length(trim(v_pluggy_tx_id)) = 0
     or v_posted_at is null
     or v_amount is null
     or v_currency is null or length(trim(v_currency)) = 0 then
    return jsonb_build_object('success', false, 'reason', 'invalid_input');
  end if;

  select user_id into v_landlord_id
    from bank_accounts
   where id = p_bank_account_id;

  if v_landlord_id is null then
    return jsonb_build_object('success', false, 'reason', 'bank_account_not_found');
  end if;

  insert into bank_transactions (
    bank_account_id, user_id, pluggy_transaction_id, posted_at,
    amount_minor, currency, description,
    counterparty_cpf, counterparty_name, raw
  )
  values (
    p_bank_account_id, v_landlord_id, v_pluggy_tx_id, v_posted_at,
    v_amount, v_currency, v_description,
    v_counterparty_cpf, v_counterparty_name, p_transaction
  )
  -- A transaction first seen as PENDING (placeholder amount/date) settles later
  -- and is redelivered as transactions/updated. Refresh the stored row when a
  -- match-relevant field actually changed, so the re-match below can run. An
  -- unchanged replay leaves the row untouched (the WHERE suppresses the UPDATE,
  -- so RETURNING yields nothing) and short-circuits as a duplicate — preserving
  -- idempotency and avoiding audit-trigger noise.
  on conflict (bank_account_id, pluggy_transaction_id) do update
     set posted_at         = excluded.posted_at,
         amount_minor      = excluded.amount_minor,
         currency          = excluded.currency,
         description       = excluded.description,
         counterparty_cpf  = excluded.counterparty_cpf,
         counterparty_name = excluded.counterparty_name,
         raw               = excluded.raw
   where bank_transactions.amount_minor is distinct from excluded.amount_minor
      or bank_transactions.posted_at    is distinct from excluded.posted_at
      or bank_transactions.currency     is distinct from excluded.currency
  returning id into v_bank_transaction_id;

  -- Unchanged replay: insert conflicted and no match-relevant field changed, so
  -- the UPDATE was suppressed and nothing was returned. Already processed.
  if v_bank_transaction_id is null then
    return jsonb_build_object(
      'success', true, 'matched', false, 'reason', 'duplicate'
    );
  end if;

  -- If this transaction already holds an active (non-reversed) match, leave it.
  -- A settled update must not silently disturb a confirmed match; PENDING rows
  -- are unmatched, so the candidate matching below is what flips PENDING ->
  -- settled into a match.
  if exists (
    select 1 from payment_matches
     where bank_transaction_id = v_bank_transaction_id
       and reversed_at is null
  ) then
    return jsonb_build_object(
      'success', true, 'matched', true, 'reason', 'already_matched'
    );
  end if;

  -- Only credits feed the rent matcher. Debits land for record-keeping.
  if v_amount <= 0 then
    return jsonb_build_object('success', true, 'matched', false);
  end if;

  -- Candidate ledger rows. EXISTS subquery for the landlord-scope so a
  -- ledger row with multiple landlord memberships doesn't count twice. The
  -- LIMIT 2 short-circuits aggregation — we only need to know 0, 1, or 2+.
  declare
    v_candidate_ids uuid[];
  begin
    with candidates as (
      select ml.id
        from monthly_ledger ml
       where ml.status      = 'open'
         and ml.kind        = 'rent'
         and ml.bill_holder = 'tenant'
         and ml.currency    = v_currency
         and ml.amount_minor = v_amount
         -- Explicit UTC basis. v_posted_at is timestamptz; a bare ::date cast
         -- would resolve in the session TimeZone, so a credit near midnight
         -- could land on a different calendar day under a non-UTC session and
         -- shift the +/-10-day boundary. UTC also matches the TS reference
         -- matcher (match-rent.ts slices the UTC date), so the two stay aligned.
         and abs(ml.due_date - (v_posted_at at time zone 'UTC')::date) <= 10
         -- Skip obligations whose tenancy was soft-deleted after the ledger was
         -- generated. The matcher reads monthly_ledger directly and never joins
         -- rent, so without this a credit could auto-match a phantom obligation
         -- for a rental that no longer exists.
         and (
           ml.rent_id is null
           or exists (
             select 1 from rent r
              where r.id = ml.rent_id
                and r.deleted_at is null
           )
         )
         and exists (
           select 1
             from units u
             join memberships m on m.property_id = u.property_id
            where u.id = ml.unit_id
              and m.role       = 'landlord'
              and m.user_id    = v_landlord_id
              and m.deleted_at is null
         )
       limit 2
    )
    select array_agg(id) into v_candidate_ids from candidates;

    v_candidate_count := coalesce(array_length(v_candidate_ids, 1), 0);
    if v_candidate_count <> 1 then
      return jsonb_build_object('success', true, 'matched', false);
    end if;
    v_ledger_id := v_candidate_ids[1];
  end;

  insert into payment_matches (
    monthly_ledger_id, bank_transaction_id, source_side
  )
  values (v_ledger_id, v_bank_transaction_id, 'landlord')
  returning id into v_match_id;

  update monthly_ledger
     set status  = 'paid',
         paid_at = v_posted_at
   where id = v_ledger_id;

  return jsonb_build_object(
    'success',   true,
    'matched',   true,
    'ledger_id', v_ledger_id,
    'match_id',  v_match_id
  );
end;
$$;

revoke all on function apply_pluggy_transaction(uuid, jsonb) from public, anon, authenticated;
grant execute on function apply_pluggy_transaction(uuid, jsonb) to service_role;

comment on function apply_pluggy_transaction(uuid, jsonb) is
  'Webhook-only. Inserts a bank_transactions row (idempotent) and, for credits, '
  'attempts to match against an open rent ledger entry within the matcher '
  'window. Service-role only — the webhook trusts the bank_account_id arg.';

-- =============================================================================
-- unmatch_payment(p_payment_match_id uuid, p_reason text) returns jsonb
-- =============================================================================
-- Reverses an active match. Sets reversed_at / reversed_by / reversal_reason
-- on the payment_matches row, flips the ledger entry back to 'open', and
-- clears paid_at. The match row is never deleted (Decision 9 trail).
--
-- Authorized via is_unit_landlord on the ledger row's unit.
-- =============================================================================
create or replace function unmatch_payment(
  p_payment_match_id uuid,
  p_reason           text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id          uuid := auth.uid();
  v_match_id         uuid;
  v_monthly_ledger_id uuid;
  v_reversed_at      timestamptz;
  v_unit_id          uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;
  if p_payment_match_id is null then
    return jsonb_build_object('success', false, 'reason', 'invalid_input');
  end if;

  select pm.id, pm.monthly_ledger_id, pm.reversed_at, ml.unit_id
    into v_match_id, v_monthly_ledger_id, v_reversed_at, v_unit_id
    from payment_matches pm
    join monthly_ledger ml on ml.id = pm.monthly_ledger_id
   where pm.id = p_payment_match_id;

  if v_match_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  if v_reversed_at is not null then
    return jsonb_build_object('success', false, 'reason', 'already_reversed');
  end if;
  if not is_unit_landlord(v_unit_id) then
    return jsonb_build_object('success', false, 'reason', 'not_authorized');
  end if;

  update payment_matches
     set reversed_at     = now(),
         reversed_by     = v_user_id,
         reversal_reason = p_reason
   where id = p_payment_match_id;

  update monthly_ledger
     set status  = 'open',
         paid_at = null
   where id = v_monthly_ledger_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function unmatch_payment(uuid, text) from public, anon;
grant execute on function unmatch_payment(uuid, text) to authenticated;

comment on function unmatch_payment(uuid, text) is
  'Reverses an active payment_matches row. Authorized via is_unit_landlord on '
  'the linked ledger row. The match row is retained — never deleted.';

-- =============================================================================
-- Backfill: populate the ledger for any rent rows that already exist (local
-- dev / production). Function is idempotent, so re-runs are harmless.
-- =============================================================================
do $$
declare
  r record;
begin
  for r in select id from rent where deleted_at is null loop
    perform generate_rent_ledger_entries(r.id);
  end loop;
end;
$$;
