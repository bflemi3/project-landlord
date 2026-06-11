-- =============================================================================
-- LOCAL SEED — PRO-73 charges ledger. LOCAL ONLY.
-- Runs on `supabase db reset` / `supabase start`. NEVER applied to prod
-- (`supabase db push --linked` runs migrations only, never this file).
--
-- 5 fake users (@mabenn.dev, password: mabenn-dev), 4 properties covering the
-- full ledger variance + both empty states. All amounts in centavos (BRL).
-- No verification email is sent: users are inserted with email_confirmed_at set,
-- and local mail goes to Mailpit (:54324) regardless.
--
-- Fixed UUIDs so the seed is deterministic and re-runnable.
--
-- All bill/payment dates are RELATIVE to the run date: history sits on a
-- month grid (1–3 months back via pg_temp.month_day), current-month dates
-- clamp to today, and "due" rows anchor to current_date + N so they stay
-- genuinely due whenever the seed runs.
-- =============================================================================

-- Day `day_of_month` of the month `months_ago` months before the current one.
-- pg_temp: session-scoped, vanishes after the seed run.
create function pg_temp.month_day(months_ago int, day_of_month int) returns date
language sql stable as $$
  select (
    date_trunc('month', current_date)
    - make_interval(months => months_ago)
    + make_interval(days => day_of_month - 1)
  )::date
$$;

-- -----------------------------------------------------------------------------
-- 1. Auth users (+ identities). handle_new_user trigger creates the profiles.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'carlos@mabenn.dev',  crypt('mabenn-dev', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"has_redeemed_invite":true}', '{"full_name":"Carlos Mendes","email":"carlos@mabenn.dev"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'beatriz@mabenn.dev', crypt('mabenn-dev', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"has_redeemed_invite":true}', '{"full_name":"Beatriz Mendes","email":"beatriz@mabenn.dev"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rafael@mabenn.dev',  crypt('mabenn-dev', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"has_redeemed_invite":true}', '{"full_name":"Rafael Souza","email":"rafael@mabenn.dev"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'marina@mabenn.dev',  crypt('mabenn-dev', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"has_redeemed_invite":true}', '{"full_name":"Marina Lima","email":"marina@mabenn.dev"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'joao@mabenn.dev',    crypt('mabenn-dev', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"has_redeemed_invite":true}', '{"full_name":"João Pereira","email":"joao@mabenn.dev"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"carlos@mabenn.dev","email_verified":true}',  'email', now(), now(), now()),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"beatriz@mabenn.dev","email_verified":true}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","email":"rafael@mabenn.dev","email_verified":true}',  'email', now(), now(), now()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"marina@mabenn.dev","email_verified":true}',  'email', now(), now(), now()),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","email":"joao@mabenn.dev","email_verified":true}',    'email', now(), now(), now());

-- Mark invite-redeemed (syncs the JWT claim via trigger) + set tax_id.
update public.profiles set has_redeemed_invite = true, preferred_locale = 'pt-BR',
  tax_id = case id
    when 'aaaaaaaa-0000-0000-0000-000000000001' then '11111111111'
    when 'aaaaaaaa-0000-0000-0000-000000000002' then '22222222222'
    when 'bbbbbbbb-0000-0000-0000-000000000001' then '33333333333'
    when 'bbbbbbbb-0000-0000-0000-000000000002' then '44444444444'
    when 'bbbbbbbb-0000-0000-0000-000000000003' then '55555555555'
  end
where id in (
  'aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000003'
);

-- -----------------------------------------------------------------------------
-- 2. Properties + units (created_by = Carlos / LL1).
-- -----------------------------------------------------------------------------
insert into properties (id, name, street, number, neighborhood, city, state, postal_code, country_code, created_by)
values
  ('11111111-0000-0000-0000-000000000001', 'Apt 23B',        'Rua Joaquim Távora', '850',  'Vila Mariana', 'São Paulo', 'SP', '04015-012', 'BR', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'Casa Pinheiros', 'Rua dos Pinheiros',  '1200', 'Pinheiros',    'São Paulo', 'SP', '05422-002', 'BR', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000003', 'Studio Augusta', 'Rua Augusta',        '1500', 'Consolação',   'São Paulo', 'SP', '01304-001', 'BR', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000004', 'Loft Itaim',     'Rua João Cachoeira', '400',  'Itaim Bibi',   'São Paulo', 'SP', '04535-000', 'BR', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into units (id, property_id, name) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Apt 23B'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Casa'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Studio'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Loft');

-- -----------------------------------------------------------------------------
-- 3. Memberships. P1 = 2 LL (co-owners) + 2 tenants (co-tenants). P2 = LL1+T3.
--    P3/P4 = LL1 only.
-- -----------------------------------------------------------------------------
insert into memberships (user_id, property_id, unit_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'landlord'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'landlord'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'tenant'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'tenant'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'landlord'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'tenant'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 'landlord'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', 'landlord');

-- Pending tenant invite on P3 (Studio Augusta) — shows the "invited, not yet joined" state.
insert into invitations (property_id, invited_by, invited_email, invited_name, role, status)
values ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'inquilino.studio@mabenn.dev', 'Inquilino Studio', 'tenant', 'pending');

-- -----------------------------------------------------------------------------
-- 3b. Contracts. P1 active (open lease), P2 closed (ended) → exercises the
--     property status indicator. P3/P4 have none. storage_path is a placeholder
--     (no real file); only is_active + existence drive the indicator.
-- -----------------------------------------------------------------------------
insert into contracts (id, unit_id, storage_path, mime_type, uploaded_by, upload_status, is_active) values
  ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001/55555555-0000-0000-0000-000000000001.pdf', 'application/pdf', 'aaaaaaaa-0000-0000-0000-000000000001', 'uploaded', true),
  ('55555555-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002/55555555-0000-0000-0000-000000000002.pdf', 'application/pdf', 'aaaaaaaa-0000-0000-0000-000000000001', 'uploaded', false);

-- -----------------------------------------------------------------------------
-- 4. Providers + invoice profiles. Display names derive from
--    expense_type + the linked provider (charge_instances has no name column);
--    parser_strategy is legacy plumbing — extraction is moving to LLM.
-- -----------------------------------------------------------------------------
insert into providers (id, name, display_name, country_code) values
  ('66666666-0000-0000-0000-000000000001', 'ENEL Distribuição São Paulo', 'ENEL',          'BR'),
  ('66666666-0000-0000-0000-000000000002', 'Sabesp',                      'Sabesp',        'BR'),
  ('66666666-0000-0000-0000-000000000003', 'Comgás',                      'Comgás',        'BR'),
  ('66666666-0000-0000-0000-000000000004', 'Telefônica Brasil',           'Vivo',          'BR'),
  ('66666666-0000-0000-0000-000000000005', 'CPFL Energia',                'CPFL',          'BR'),
  ('66666666-0000-0000-0000-000000000006', 'Claro',                       'Claro',         'BR'),
  ('66666666-0000-0000-0000-000000000007', 'Prefeitura de São Paulo',     'Prefeitura SP', 'BR'),
  ('66666666-0000-0000-0000-000000000008', 'Condomínio Edifício Aurora',  'Ed. Aurora',    'BR'),
  ('66666666-0000-0000-0000-000000000009', 'Condomínio Pinheiros 1200',   'Pinheiros 1200','BR');

insert into provider_invoice_profiles (id, provider_id, name, parser_strategy) values
  ('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'ENEL · default',          'llm'),
  ('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000002', 'Sabesp · default',        'llm'),
  ('77777777-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000003', 'Comgás · default',        'llm'),
  ('77777777-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000004', 'Vivo · default',          'llm'),
  ('77777777-0000-0000-0000-000000000005', '66666666-0000-0000-0000-000000000005', 'CPFL · default',          'llm'),
  ('77777777-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000006', 'Claro · default',         'llm'),
  ('77777777-0000-0000-0000-000000000007', '66666666-0000-0000-0000-000000000007', 'Prefeitura SP · default', 'llm'),
  ('77777777-0000-0000-0000-000000000008', '66666666-0000-0000-0000-000000000008', 'Ed. Aurora · default',    'llm'),
  ('77777777-0000-0000-0000-000000000009', '66666666-0000-0000-0000-000000000009', 'Pinheiros · default',     'llm');

-- -----------------------------------------------------------------------------
-- 4b. Charge definitions. Fixed → amount_minor set; variable/unknown → null.
--     `name` mirrors what the app writes today (the expense_type — a
--     persistence detail; display derives from type + provider).
-- -----------------------------------------------------------------------------
insert into charge_definitions (id, unit_id, name, expense_type, amount_behavior, amount_minor, provider_profile_id, is_active) values
  -- P1 · Apt 23B
  ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'electricity', 'electricity', 'variable', null,  '77777777-0000-0000-0000-000000000001', true),
  ('44444444-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'water',       'water',       'variable', null,  '77777777-0000-0000-0000-000000000002', true),
  ('44444444-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'condo',       'condo',       'fixed',    48000, '77777777-0000-0000-0000-000000000008', true),
  ('44444444-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'internet',    'internet',    'fixed',    15900, '77777777-0000-0000-0000-000000000004', true),
  ('44444444-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'gas',         'gas',         'variable', null,  '77777777-0000-0000-0000-000000000003', true),
  ('44444444-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'other',       'other',       'fixed',    24000, '77777777-0000-0000-0000-000000000007', true),
  -- P2 · Casa Pinheiros
  ('44444444-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002', 'electricity', 'electricity', 'variable', null,  '77777777-0000-0000-0000-000000000005', true),
  ('44444444-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000002', 'condo',       'condo',       'fixed',    65000, '77777777-0000-0000-0000-000000000009', true),
  ('44444444-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000002', 'internet',    'internet',    'fixed',    12000, '77777777-0000-0000-0000-000000000006', true),
  -- P3 · Studio Augusta — configured, NO instances. Condo + internet have no
  -- provider yet (exercises the type-word-only display fallback).
  ('44444444-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-000000000003', 'electricity', 'electricity', 'variable', null,  '77777777-0000-0000-0000-000000000001', true),
  ('44444444-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-000000000003', 'condo',       'condo',       'fixed',    39000, null,                                   true),
  ('44444444-0000-0000-0000-00000000000c', '22222222-0000-0000-0000-000000000003', 'internet',    'internet',    'unknown',  null,  null,                                   true);
-- P4 · Loft Itaim has NO charge_definitions (the "no expenses configured" state).

-- Responsibility: tenant-owned (electricity/water/internet/gas) vs landlord-owned (condo/IPTU). 100% to one role.
insert into responsibility_allocations (charge_definition_id, role, allocation_type, percentage) values
  ('44444444-0000-0000-0000-000000000001', 'tenant',   'percentage', 100),
  ('44444444-0000-0000-0000-000000000002', 'tenant',   'percentage', 100),
  ('44444444-0000-0000-0000-000000000003', 'landlord', 'percentage', 100),
  ('44444444-0000-0000-0000-000000000004', 'tenant',   'percentage', 100),
  ('44444444-0000-0000-0000-000000000005', 'tenant',   'percentage', 100),
  ('44444444-0000-0000-0000-000000000006', 'landlord', 'percentage', 100),
  ('44444444-0000-0000-0000-000000000007', 'tenant',   'percentage', 100),
  ('44444444-0000-0000-0000-000000000008', 'landlord', 'percentage', 100),
  ('44444444-0000-0000-0000-000000000009', 'tenant',   'percentage', 100);

-- -----------------------------------------------------------------------------
-- 5. Charge instances (the discovered obligations / ledger rows).
--    tenant-owned → tenant_percentage 10000; landlord-owned → landlord_percentage 10000.
-- -----------------------------------------------------------------------------
insert into charge_instances (id, charge_definition_id, amount_minor, issued_on, due_date, tenant_percentage, landlord_percentage) values
  -- P1 Energia (variable, tenant, split 50/50): months -3/-2 paid, last month partial (→ overdue)
  ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 32000, pg_temp.month_day(3, 2),  pg_temp.month_day(3, 20), 10000, 0),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 28800, pg_temp.month_day(2, 3),  pg_temp.month_day(2, 20), 10000, 0),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 41500, pg_temp.month_day(1, 4),  pg_temp.month_day(1, 20), 10000, 0),
  -- P1 Água (variable, tenant): months -3/-2 paid, last month OVERDUE
  ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000002', 9600, pg_temp.month_day(3, 10), pg_temp.month_day(3, 25), 10000, 0),
  ('33333333-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000002', 11200, pg_temp.month_day(2, 11), pg_temp.month_day(2, 25), 10000, 0),
  ('33333333-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000002', 8800, pg_temp.month_day(1, 12), pg_temp.month_day(1, 25), 10000, 0),
  -- P1 Condomínio (fixed, landlord): -3 on-time, -2 LATE, -1 paid
  ('33333333-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000003', 48000, pg_temp.month_day(3, 5),  pg_temp.month_day(3, 10), 0, 10000),
  ('33333333-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000003', 48000, pg_temp.month_day(2, 5),  pg_temp.month_day(2, 10), 0, 10000),
  ('33333333-0000-0000-0000-000000000009', '44444444-0000-0000-0000-000000000003', 48000, pg_temp.month_day(1, 5),  pg_temp.month_day(1, 10), 0, 10000),
  -- P1 Internet (fixed, tenant): only 2 instances (partial avg), NULL due_date
  ('33333333-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-000000000004', 15900, pg_temp.month_day(2, 6),  null,                     10000, 0),
  ('33333333-0000-0000-0000-00000000000b', '44444444-0000-0000-0000-000000000004', 15900, pg_temp.month_day(1, 6),  null,                     10000, 0),
  -- P1 Gás (variable, tenant): single instance, DUE (due date always ahead of today)
  ('33333333-0000-0000-0000-00000000000c', '44444444-0000-0000-0000-000000000005', 7400, pg_temp.month_day(1, 25), current_date + 10,        10000, 0),
  -- P2 Energia · CPFL (variable, tenant): all paid
  ('33333333-0000-0000-0000-00000000000d', '44444444-0000-0000-0000-000000000007', 21000, pg_temp.month_day(3, 8),  pg_temp.month_day(3, 22), 10000, 0),
  ('33333333-0000-0000-0000-00000000000e', '44444444-0000-0000-0000-000000000007', 19500, pg_temp.month_day(2, 9),  pg_temp.month_day(2, 22), 10000, 0),
  ('33333333-0000-0000-0000-00000000000f', '44444444-0000-0000-0000-000000000007', 24000, pg_temp.month_day(1, 10), pg_temp.month_day(1, 22), 10000, 0),
  -- P2 Condomínio (fixed, landlord): all paid
  ('33333333-0000-0000-0000-000000000010', '44444444-0000-0000-0000-000000000008', 65000, pg_temp.month_day(3, 5),  pg_temp.month_day(3, 10), 0, 10000),
  ('33333333-0000-0000-0000-000000000011', '44444444-0000-0000-0000-000000000008', 65000, pg_temp.month_day(2, 5),  pg_temp.month_day(2, 10), 0, 10000),
  ('33333333-0000-0000-0000-000000000012', '44444444-0000-0000-0000-000000000008', 65000, pg_temp.month_day(1, 5),  pg_temp.month_day(1, 10), 0, 10000),
  -- P2 Internet · Claro (fixed, tenant): -2/-1 paid, current month DUE
  ('33333333-0000-0000-0000-000000000013', '44444444-0000-0000-0000-000000000009', 12000, pg_temp.month_day(2, 6),  pg_temp.month_day(2, 15), 10000, 0),
  ('33333333-0000-0000-0000-000000000014', '44444444-0000-0000-0000-000000000009', 12000, pg_temp.month_day(1, 6),  pg_temp.month_day(1, 15), 10000, 0),
  ('33333333-0000-0000-0000-000000000015', '44444444-0000-0000-0000-000000000009', 12000, pg_temp.month_day(0, 1),  current_date + 4,         10000, 0);

-- Per-tenant split on P1 Energia (Rafael / Marina 50/50).
insert into tenant_splits (charge_instance_id, user_id, percentage) values
  ('33333333-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 50),
  ('33333333-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 50),
  ('33333333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 50),
  ('33333333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 50),
  ('33333333-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 50),
  ('33333333-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 50);

-- -----------------------------------------------------------------------------
-- 6. Charge payments (discovered settlements). Vary paid_by + payment_method.
--    May Energia (I3) = T1's half only → partially paid. May Água (I6),
--    P1 Gás (I12), P1 Internet May (I0b), P2 Internet Jun (I15) = unpaid.
-- -----------------------------------------------------------------------------
insert into charge_payments (charge_instance_id, paid_by, amount_minor, paid_on, payment_method) values
  -- P1 Energia: -3 both halves, -2 both halves, -1 only Rafael's half
  ('33333333-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 16000, pg_temp.month_day(3, 18), 'pix'),
  ('33333333-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 16000, pg_temp.month_day(3, 19), 'pix'),
  ('33333333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 14400, pg_temp.month_day(2, 19), 'pix'),
  ('33333333-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 14400, pg_temp.month_day(2, 15), 'credit_card'),
  ('33333333-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 20750, pg_temp.month_day(1, 19), 'pix'),
  -- P1 Água: -3/-2 paid by Rafael
  ('33333333-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001',  9600, pg_temp.month_day(3, 24), 'pix'),
  ('33333333-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', 11200, pg_temp.month_day(2, 23), 'pix'),
  -- P1 Condomínio: -3 on-time, -2 LATE (paid day 18 vs due day 10), -1 on-time
  ('33333333-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 48000, pg_temp.month_day(3, 9),  'bank_transfer'),
  ('33333333-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 48000, pg_temp.month_day(2, 18), 'bank_transfer'),
  ('33333333-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 48000, pg_temp.month_day(1, 10), 'bank_transfer'),
  -- P1 Internet: -2 paid by Marina, -1 unpaid (due, null due_date)
  ('33333333-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000002', 15900, pg_temp.month_day(2, 10), 'debit_card'),
  -- P2 Energia · CPFL: all paid by João
  ('33333333-0000-0000-0000-00000000000d', 'bbbbbbbb-0000-0000-0000-000000000003', 21000, pg_temp.month_day(3, 20), 'pix'),
  ('33333333-0000-0000-0000-00000000000e', 'bbbbbbbb-0000-0000-0000-000000000003', 19500, pg_temp.month_day(2, 21), 'debit_card'),
  ('33333333-0000-0000-0000-00000000000f', 'bbbbbbbb-0000-0000-0000-000000000003', 24000, pg_temp.month_day(1, 21), 'pix'),
  -- P2 Condomínio: all paid by LL1
  ('33333333-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001', 65000, pg_temp.month_day(3, 9),  'bank_transfer'),
  ('33333333-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 65000, pg_temp.month_day(2, 9),  'bank_transfer'),
  ('33333333-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001', 65000, pg_temp.month_day(1, 9),  'bank_transfer'),
  -- P2 Internet · Claro: -2/-1 paid by João, current month unpaid (due)
  ('33333333-0000-0000-0000-000000000013', 'bbbbbbbb-0000-0000-0000-000000000003', 12000, pg_temp.month_day(2, 14), 'pix'),
  ('33333333-0000-0000-0000-000000000014', 'bbbbbbbb-0000-0000-0000-000000000003', 12000, pg_temp.month_day(1, 14), 'pix');

-- -----------------------------------------------------------------------------
-- 7. Current-month bills for P1 — populates the live Bills summary
--    (Due/Paid/Awaiting). Condomínio partial + Internet paid; Energia + Água
--    unpaid. issued_on/paid_on clamp to today (early-month runs never produce
--    future-dated discoveries); due dates ride ahead of current_date so the
--    unpaid rows always read Due, never Overdue.
-- -----------------------------------------------------------------------------
--    Condomínio is split 50/50 LL↔tenant (5000/5000) and the LL has only
--    partially paid their half → exercises the "you · R$X" share line.
insert into charge_instances (id, charge_definition_id, amount_minor, issued_on, due_date, tenant_percentage, landlord_percentage) values
  ('33333333-0000-0000-0000-000000000016', '44444444-0000-0000-0000-000000000003', 48000, least(pg_temp.month_day(0, 5), current_date), current_date + 5,  5000,  5000),
  ('33333333-0000-0000-0000-000000000017', '44444444-0000-0000-0000-000000000004', 15900, least(pg_temp.month_day(0, 6), current_date), current_date + 9,  10000, 0),
  ('33333333-0000-0000-0000-000000000018', '44444444-0000-0000-0000-000000000001', 38000, least(pg_temp.month_day(0, 3), current_date), current_date + 9,  10000, 0),
  ('33333333-0000-0000-0000-000000000019', '44444444-0000-0000-0000-000000000002', 10000, least(pg_temp.month_day(0, 4), current_date), current_date + 14, 10000, 0);

insert into charge_payments (charge_instance_id, paid_by, amount_minor, paid_on, payment_method) values
  ('33333333-0000-0000-0000-000000000016', 'aaaaaaaa-0000-0000-0000-000000000001', 10000, least(pg_temp.month_day(0, 9), current_date),  'bank_transfer'),
  ('33333333-0000-0000-0000-000000000017', 'bbbbbbbb-0000-0000-0000-000000000002', 15900, least(pg_temp.month_day(0, 10), current_date), 'debit_card');
