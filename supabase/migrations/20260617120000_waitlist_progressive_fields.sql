-- =============================================================================
-- Progressive waitlist: richer lead profile + first-touch attribution.
--
-- The landing waitlist becomes two-phase (capture email at the gate, enrich in a
-- modal). This migration is additive and non-destructive:
--   * widens the `role` CHECK to the 5 captured roles
--   * adds nullable profile columns (property_count, workflow, feedback)
--   * adds nullable first-touch attribution columns (utm_*, referrer, landing_path)
--   * adds `completed_at` to mark the modal-enrich step (drives the once-only
--     welcome email)
--   * adds two SECURITY DEFINER RPCs (capture + complete) granted to anon
--
-- Existing rows predate every new column and keep their values; the new columns
-- default NULL, which the app treats as "email-only lead, not yet enriched" — so
-- existing users are unaffected (database-migrations backfill rule). The legacy
-- 3-arg join_waitlist is left intact; the TS layer calls the new RPCs.
--
-- Writes stay RPC-only (RLS enabled, no policies) — no policy change here.
-- =============================================================================

-- --- role CHECK: 2 tokens -> 5 -------------------------------------------------
-- The original inline CHECK was auto-named `waitlist_role_check`. Drop it and add
-- a widened named constraint. Existing rows are all 'landlord'/'tenant', so they
-- satisfy the new set.
alter table public.waitlist drop constraint if exists waitlist_role_check;
alter table public.waitlist
  add constraint waitlist_role_check
  check (role in ('landlord', 'tenant', 'both', 'imobiliaria', 'other'));

-- --- profile + attribution columns (all nullable) -----------------------------
alter table public.waitlist
  add column if not exists property_count text,
  add column if not exists workflow      text[],
  add column if not exists feedback      text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text,
  add column if not exists utm_content   text,
  add column if not exists utm_term      text,
  add column if not exists referrer      text,
  add column if not exists landing_path  text,
  add column if not exists completed_at  timestamptz;

-- Closed-set CHECKs written `is null or in (...)` so existing/legacy NULL rows
-- pass while new non-null values are constrained to the fixed token sets.
alter table public.waitlist
  add constraint waitlist_property_count_check
  check (property_count is null or property_count in ('0', '1', '2-5', '6-10', '10+'));

-- workflow is multi-select: every element must be in the allowed token set
-- (`<@` = array contained by). NULL stays valid for legacy/email-only rows.
alter table public.waitlist
  add constraint waitlist_workflow_check
  check (
    workflow is null or workflow <@ array[
      'whatsapp', 'email', 'spreadsheet', 'bank_app', 'imobiliaria',
      'marketplace', 'dedicated_software', 'accountant', 'other'
    ]::text[]
  );

-- =============================================================================
-- RPC: waitlist_capture (gate) — write the email immediately.
--
-- Inserts the email + locale + first-touch attribution (+ the toggle role) so
-- the lead is captured even if the enrich modal is abandoned. First signup wins
-- on email conflict; returns whether a row was newly created.
-- =============================================================================
create or replace function public.waitlist_capture(
  p_email        text,
  p_locale       text default 'en',
  p_role         text default 'landlord',
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null,
  p_utm_content  text default null,
  p_utm_term     text default null,
  p_referrer     text default null,
  p_landing_path text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.waitlist (
    email, locale, role,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, landing_path
  )
  values (
    lower(trim(p_email)),
    p_locale,
    case when p_role in ('landlord', 'tenant', 'both', 'imobiliaria', 'other')
         then p_role else 'landlord' end,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_referrer, p_landing_path
  )
  on conflict (email) do nothing;
  -- FOUND is true when the insert added a row, false on conflict (already listed).
  return FOUND;
end;
$$;

grant execute on function public.waitlist_capture(
  text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- =============================================================================
-- RPC: waitlist_complete (modal enrich) — fill the profile, stamp completed_at.
--
-- Updates the captured row (by email) with role + property_count + workflow +
-- feedback and stamps completed_at. Returns whether this was the FIRST
-- completion (completed_at was null before) so the caller sends the welcome
-- email exactly once. If no row exists yet (modal submitted without a prior
-- capture), inserts a fully-completed row. Token values are validated with safe
-- fallbacks (role -> 'landlord'; count/workflow -> null) as the gate does.
-- =============================================================================
create or replace function public.waitlist_complete(
  p_email          text,
  p_role           text default 'landlord',
  p_property_count text default null,
  p_workflow       text[] default null,
  p_feedback       text default null,
  p_locale         text default 'en'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := lower(trim(p_email));
  v_role     text := case when p_role in ('landlord', 'tenant', 'both', 'imobiliaria', 'other')
                          then p_role else 'landlord' end;
  v_count    text := case when p_property_count in ('0', '1', '2-5', '6-10', '10+')
                          then p_property_count else null end;
  -- Keep only recognized workflow tokens; an empty result collapses to NULL.
  v_workflow text[] := (
    select array_agg(x)
    from unnest(coalesce(p_workflow, '{}'::text[])) as x
    where x in (
      'whatsapp', 'email', 'spreadsheet', 'bank_app', 'imobiliaria',
      'marketplace', 'dedicated_software', 'accountant', 'other')
  );
  v_feedback text := nullif(trim(coalesce(p_feedback, '')), '');
  v_first    boolean;
begin
  select completed_at is null into v_first
  from public.waitlist
  where email = v_email;

  if not found then
    -- No prior capture (e.g. attribution write failed) — insert as completed.
    insert into public.waitlist (
      email, role, property_count, workflow, feedback, locale, completed_at
    )
    values (v_email, v_role, v_count, v_workflow, v_feedback, p_locale, now())
    on conflict (email) do update set
      role          = excluded.role,
      property_count = excluded.property_count,
      workflow      = excluded.workflow,
      feedback      = excluded.feedback,
      locale        = excluded.locale,
      completed_at  = coalesce(public.waitlist.completed_at, excluded.completed_at);
    return true;
  end if;

  update public.waitlist set
    role          = v_role,
    property_count = v_count,
    workflow      = v_workflow,
    feedback      = v_feedback,
    locale        = p_locale,
    completed_at  = coalesce(completed_at, now())
  where email = v_email;

  return v_first;
end;
$$;

grant execute on function public.waitlist_complete(
  text, text, text, text[], text, text
) to anon, authenticated;
