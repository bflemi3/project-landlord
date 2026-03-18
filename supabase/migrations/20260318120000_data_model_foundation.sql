-- =============================================================================
-- mabenn: Data Model Foundation
-- PRO-5: Core Postgres schema, RLS policies, indexes
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role as enum ('landlord', 'tenant');
create type charge_type as enum ('rent', 'recurring', 'variable');
create type statement_status as enum ('draft', 'published');
create type payment_status as enum ('pending', 'confirmed', 'rejected');
create type payment_method as enum ('pix', 'bank_transfer', 'cash', 'other');
create type ingestion_status as enum ('uploaded', 'processing', 'ready_for_review', 'approved', 'failed');
create type invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
create type dispute_status as enum ('open', 'resolved');
create type pix_key_type as enum ('cpf', 'email', 'phone', 'random');
create type charge_source as enum ('manual', 'imported', 'corrected');
create type split_type as enum ('percentage', 'fixed_amount');
create type audit_action as enum ('create', 'update', 'delete', 'publish', 'revise', 'confirm', 'reject');

-- =============================================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  cpf text,
  avatar_url text,
  preferred_locale text not null default 'pt-BR',
  analytics_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- =============================================================================
-- PROPERTIES
-- =============================================================================

create table properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'BR',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- =============================================================================
-- UNITS
-- =============================================================================

create table units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  due_day_of_month integer not null default 10,
  pix_key text,
  pix_key_type pix_key_type,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_units_property_id on units(property_id);

-- =============================================================================
-- MEMBERSHIPS (links users to properties with roles)
-- =============================================================================

create table memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, property_id)
);

create index idx_memberships_user_id on memberships(user_id);
create index idx_memberships_property_id on memberships(property_id);

-- =============================================================================
-- PROVIDERS / ISSUERS
-- =============================================================================

create table providers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country_code text not null default 'BR',
  tax_id text,
  phone text,
  website text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column providers.tax_id is 'CNPJ for Brazilian companies. Used for extraction matching.';

-- =============================================================================
-- PROVIDER INVOICE PROFILES
-- =============================================================================

create table provider_invoice_profiles (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  parser_strategy text not null,
  extraction_config jsonb not null default '{}',
  validation_config jsonb not null default '{}',
  version integer not null default 1,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_provider_invoice_profiles_provider_id on provider_invoice_profiles(provider_id);

-- =============================================================================
-- EXAMPLE DOCUMENTS (for provider profile selection UI)
-- =============================================================================

create table example_documents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references provider_invoice_profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index idx_example_documents_profile_id on example_documents(profile_id);

-- =============================================================================
-- CHARGE DEFINITIONS
-- =============================================================================

create table charge_definitions (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid not null references units(id) on delete cascade,
  name text not null,
  charge_type charge_type not null,
  amount_minor integer,
  currency text not null default 'BRL',
  provider_id uuid references providers(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_charge_definitions_unit_id on charge_definitions(unit_id);

-- =============================================================================
-- RECURRING RULES
-- =============================================================================

create table recurring_rules (
  id uuid primary key default uuid_generate_v4(),
  charge_definition_id uuid not null references charge_definitions(id) on delete cascade,
  start_date date not null,
  end_date date,
  day_of_month integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recurring_rules_charge_definition_id on recurring_rules(charge_definition_id);

-- =============================================================================
-- RESPONSIBILITY ALLOCATIONS
-- =============================================================================

create table responsibility_allocations (
  id uuid primary key default uuid_generate_v4(),
  charge_definition_id uuid not null references charge_definitions(id) on delete cascade,
  role user_role not null,
  allocation_type split_type not null default 'percentage',
  percentage integer,
  fixed_minor integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_percentage check (percentage is null or (percentage >= 0 and percentage <= 10000)),
  constraint valid_fixed check (fixed_minor is null or fixed_minor >= 0),
  constraint allocation_has_value check (
    (allocation_type = 'percentage' and percentage is not null) or
    (allocation_type = 'fixed_amount' and fixed_minor is not null)
  )
);

create index idx_responsibility_allocations_charge_definition_id on responsibility_allocations(charge_definition_id);

comment on column responsibility_allocations.percentage is 'Basis points (0-10000). Used when allocation_type = percentage.';
comment on column responsibility_allocations.fixed_minor is 'Fixed amount in minor units. Used when allocation_type = fixed_amount.';

-- =============================================================================
-- STATEMENTS
-- =============================================================================

create table statements (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid not null references units(id) on delete cascade,
  period_year integer not null,
  period_month integer not null,
  status statement_status not null default 'draft',
  total_amount_minor integer not null default 0,
  currency text not null default 'BRL',
  published_at timestamptz,
  revision integer not null default 1,
  revision_note text,
  previous_version_id uuid references statements(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_statements_unit_id on statements(unit_id);
create index idx_statements_period on statements(period_year, period_month);
create index idx_statements_status on statements(status);

-- =============================================================================
-- SOURCE DOCUMENTS
-- =============================================================================

create table source_documents (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer,
  ingestion_status ingestion_status not null default 'uploaded',
  profile_id uuid references provider_invoice_profiles(id),
  failure_category text,
  uploaded_by uuid not null references profiles(id),
  period_year integer,
  period_month integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_source_documents_property_id on source_documents(property_id);
create index idx_source_documents_ingestion_status on source_documents(ingestion_status);

-- =============================================================================
-- CHARGE INSTANCES
-- =============================================================================

create table charge_instances (
  id uuid primary key default uuid_generate_v4(),
  statement_id uuid not null references statements(id) on delete cascade,
  charge_definition_id uuid references charge_definitions(id),
  source_document_id uuid references source_documents(id),
  name text not null,
  amount_minor integer not null,
  currency text not null default 'BRL',
  charge_source charge_source not null default 'manual',
  split_type split_type not null default 'percentage',
  landlord_percentage integer,
  tenant_percentage integer,
  landlord_fixed_minor integer,
  tenant_fixed_minor integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_landlord_pct check (landlord_percentage is null or (landlord_percentage >= 0 and landlord_percentage <= 10000)),
  constraint valid_tenant_pct check (tenant_percentage is null or (tenant_percentage >= 0 and tenant_percentage <= 10000)),
  constraint valid_landlord_fixed check (landlord_fixed_minor is null or landlord_fixed_minor >= 0),
  constraint valid_tenant_fixed check (tenant_fixed_minor is null or tenant_fixed_minor >= 0)
);

create index idx_charge_instances_statement_id on charge_instances(statement_id);
create index idx_charge_instances_charge_definition_id on charge_instances(charge_definition_id);

comment on column charge_instances.landlord_percentage is 'Basis points (0-10000). Used when split_type = percentage.';
comment on column charge_instances.tenant_percentage is 'Basis points (0-10000). Used when split_type = percentage.';
comment on column charge_instances.landlord_fixed_minor is 'Fixed amount in minor units. Used when split_type = fixed_amount.';
comment on column charge_instances.tenant_fixed_minor is 'Fixed amount in minor units. Used when split_type = fixed_amount.';

-- =============================================================================
-- TENANT SPLITS
-- =============================================================================

create table tenant_splits (
  id uuid primary key default uuid_generate_v4(),
  charge_instance_id uuid not null references charge_instances(id) on delete cascade,
  user_id uuid not null references profiles(id),
  percentage integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_split_pct check (percentage >= 0 and percentage <= 10000)
);

create index idx_tenant_splits_charge_instance_id on tenant_splits(charge_instance_id);
create index idx_tenant_splits_user_id on tenant_splits(user_id);

comment on column tenant_splits.percentage is 'Basis points (0-10000). 10000 = 100%.';

-- =============================================================================
-- PAYMENT EVENTS
-- =============================================================================

create table payment_events (
  id uuid primary key default uuid_generate_v4(),
  statement_id uuid not null references statements(id) on delete cascade,
  user_id uuid not null references profiles(id),
  status payment_status not null default 'pending',
  payment_method payment_method,
  payment_date date,
  amount_minor integer not null,
  currency text not null default 'BRL',
  receipt_file_path text,
  rejection_reason text,
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payment_events_statement_id on payment_events(statement_id);
create index idx_payment_events_user_id on payment_events(user_id);
create index idx_payment_events_status on payment_events(status);

-- =============================================================================
-- INVITATIONS
-- =============================================================================

create table invitations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  invited_by uuid not null references profiles(id),
  invited_email text not null,
  invited_name text,
  role user_role not null,
  status invitation_status not null default 'pending',
  personal_note text,
  property_address_hint text,
  accepted_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invitations_invited_email on invitations(invited_email);
create index idx_invitations_property_id on invitations(property_id);
create index idx_invitations_status on invitations(status);

-- =============================================================================
-- DISPUTES
-- =============================================================================

create table disputes (
  id uuid primary key default uuid_generate_v4(),
  charge_instance_id uuid not null references charge_instances(id) on delete cascade,
  raised_by uuid not null references profiles(id),
  issue_type text not null,
  description text,
  status dispute_status not null default 'open',
  resolution_note text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_disputes_charge_instance_id on disputes(charge_instance_id);
create index idx_disputes_raised_by on disputes(raised_by);
create index idx_disputes_status on disputes(status);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null,
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(user_id, is_read);

-- =============================================================================
-- AUDIT EVENTS
-- =============================================================================

create table audit_events (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action audit_action not null,
  entity_type text not null,
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_events_entity on audit_events(entity_type, entity_id);
create index idx_audit_events_actor_id on audit_events(actor_id);
create index idx_audit_events_created_at on audit_events(created_at);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where column_name = 'updated_at'
      and table_schema = 'public'
      and table_name != 'audit_events'
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function update_updated_at()',
      t
    );
  end loop;
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table memberships enable row level security;
alter table providers enable row level security;
alter table provider_invoice_profiles enable row level security;
alter table example_documents enable row level security;
alter table charge_definitions enable row level security;
alter table recurring_rules enable row level security;
alter table responsibility_allocations enable row level security;
alter table statements enable row level security;
alter table source_documents enable row level security;
alter table charge_instances enable row level security;
alter table tenant_splits enable row level security;
alter table payment_events enable row level security;
alter table invitations enable row level security;
alter table disputes enable row level security;
alter table notifications enable row level security;
alter table audit_events enable row level security;

-- Helper: check if user is a member of a property
create or replace function is_property_member(prop_id uuid)
returns boolean as $$
  select exists (
    select 1 from memberships
    where property_id = prop_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$ language sql security definer stable;

-- Helper: check if user is landlord of a property
create or replace function is_property_landlord(prop_id uuid)
returns boolean as $$
  select exists (
    select 1 from memberships
    where property_id = prop_id
      and user_id = auth.uid()
      and role = 'landlord'
      and deleted_at is null
  );
$$ language sql security definer stable;

-- ---- PROFILES ----
create policy "Users can view own profile"
  on profiles for select using (id = auth.uid());
create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

-- ---- PROPERTIES ----
create policy "Members can view their properties"
  on properties for select using (is_property_member(id));
create policy "Landlords can create properties"
  on properties for insert with check (created_by = auth.uid());
create policy "Landlords can update their properties"
  on properties for update using (is_property_landlord(id));

-- ---- UNITS ----
create policy "Members can view units"
  on units for select using (is_property_member(property_id));
create policy "Landlords can manage units"
  on units for insert with check (is_property_landlord(property_id));
create policy "Landlords can update units"
  on units for update using (is_property_landlord(property_id));

-- ---- MEMBERSHIPS ----
create policy "Users can view own memberships"
  on memberships for select using (user_id = auth.uid());
create policy "Members can view co-members"
  on memberships for select using (is_property_member(property_id));
create policy "Landlords can manage memberships"
  on memberships for insert with check (is_property_landlord(property_id));
create policy "Landlords can update memberships"
  on memberships for update using (is_property_landlord(property_id));

-- ---- PROVIDERS (public read) ----
create policy "Anyone can view providers"
  on providers for select using (true);

-- ---- PROVIDER INVOICE PROFILES (public read) ----
create policy "Anyone can view profiles"
  on provider_invoice_profiles for select using (true);

-- ---- EXAMPLE DOCUMENTS (public read) ----
create policy "Anyone can view examples"
  on example_documents for select using (true);

-- ---- CHARGE DEFINITIONS ----
create policy "Members can view charge definitions"
  on charge_definitions for select using (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_member(units.property_id))
  );
create policy "Landlords can manage charge definitions"
  on charge_definitions for insert with check (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_landlord(units.property_id))
  );
create policy "Landlords can update charge definitions"
  on charge_definitions for update using (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_landlord(units.property_id))
  );

-- ---- RECURRING RULES ----
create policy "Members can view recurring rules"
  on recurring_rules for select using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = recurring_rules.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Landlords can manage recurring rules"
  on recurring_rules for insert with check (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = recurring_rules.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );
create policy "Landlords can update recurring rules"
  on recurring_rules for update using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = recurring_rules.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );

-- ---- RESPONSIBILITY ALLOCATIONS ----
create policy "Members can view allocations"
  on responsibility_allocations for select using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Landlords can manage allocations"
  on responsibility_allocations for insert with check (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );
create policy "Landlords can update allocations"
  on responsibility_allocations for update using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );

-- ---- STATEMENTS ----
create policy "Members can view statements"
  on statements for select using (
    exists (select 1 from units where units.id = statements.unit_id and is_property_member(units.property_id))
  );
create policy "Landlords can create statements"
  on statements for insert with check (
    exists (select 1 from units where units.id = statements.unit_id and is_property_landlord(units.property_id))
  );
create policy "Landlords can update statements"
  on statements for update using (
    exists (select 1 from units where units.id = statements.unit_id and is_property_landlord(units.property_id))
  );

-- ---- SOURCE DOCUMENTS ----
create policy "Members can view source documents"
  on source_documents for select using (is_property_member(property_id));
create policy "Landlords can upload documents"
  on source_documents for insert with check (is_property_landlord(property_id));
create policy "Landlords can update documents"
  on source_documents for update using (is_property_landlord(property_id));

-- ---- CHARGE INSTANCES ----
create policy "Members can view charge instances"
  on charge_instances for select using (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = charge_instances.statement_id
        and is_property_member(u.property_id)
    )
  );
create policy "Landlords can manage charge instances"
  on charge_instances for insert with check (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = charge_instances.statement_id
        and is_property_landlord(u.property_id)
    )
  );
create policy "Landlords can update charge instances"
  on charge_instances for update using (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = charge_instances.statement_id
        and is_property_landlord(u.property_id)
    )
  );

-- ---- TENANT SPLITS ----
create policy "Members can view splits"
  on tenant_splits for select using (
    exists (
      select 1 from charge_instances ci
      join statements s on s.id = ci.statement_id
      join units u on u.id = s.unit_id
      where ci.id = tenant_splits.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Tenants can manage own splits"
  on tenant_splits for insert with check (user_id = auth.uid());
create policy "Tenants can update own splits"
  on tenant_splits for update using (user_id = auth.uid());

-- ---- PAYMENT EVENTS ----
create policy "Members can view payments"
  on payment_events for select using (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = payment_events.statement_id
        and is_property_member(u.property_id)
    )
  );
create policy "Tenants can mark payments"
  on payment_events for insert with check (user_id = auth.uid());
create policy "Members can update payments"
  on payment_events for update using (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = payment_events.statement_id
        and is_property_member(u.property_id)
    )
  );

-- ---- INVITATIONS ----
create policy "Users can view invitations they sent"
  on invitations for select using (invited_by = auth.uid());
create policy "Users can view invitations sent to them"
  on invitations for select using (invited_email = (select email from profiles where id = auth.uid()));
create policy "Users can create invitations"
  on invitations for insert with check (invited_by = auth.uid());
create policy "Invited users can update invitation status"
  on invitations for update using (
    invited_email = (select email from profiles where id = auth.uid())
  );

-- ---- DISPUTES ----
create policy "Members can view disputes"
  on disputes for select using (
    exists (
      select 1 from charge_instances ci
      join statements s on s.id = ci.statement_id
      join units u on u.id = s.unit_id
      where ci.id = disputes.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can create disputes"
  on disputes for insert with check (raised_by = auth.uid());
create policy "Members can update disputes"
  on disputes for update using (
    exists (
      select 1 from charge_instances ci
      join statements s on s.id = ci.statement_id
      join units u on u.id = s.unit_id
      where ci.id = disputes.charge_instance_id
        and is_property_member(u.property_id)
    )
  );

-- ---- NOTIFICATIONS ----
create policy "Users can view own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications"
  on notifications for update using (user_id = auth.uid());

-- ---- AUDIT EVENTS (read-only for landlords) ----
create policy "Landlords can view audit events for their properties"
  on audit_events for select using (actor_id = auth.uid());

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('source-documents', 'source-documents', false),
  ('payment-receipts', 'payment-receipts', false),
  ('example-documents', 'example-documents', true);

-- Source documents: only property members can access
create policy "Property members can view source documents"
  on storage.objects for select using (
    bucket_id = 'source-documents'
    and auth.uid() is not null
  );
create policy "Landlords can upload source documents"
  on storage.objects for insert with check (
    bucket_id = 'source-documents'
    and auth.uid() is not null
  );

-- Payment receipts: only property members can access
create policy "Property members can view payment receipts"
  on storage.objects for select using (
    bucket_id = 'payment-receipts'
    and auth.uid() is not null
  );
create policy "Users can upload payment receipts"
  on storage.objects for insert with check (
    bucket_id = 'payment-receipts'
    and auth.uid() is not null
  );

-- Example documents: public read
create policy "Anyone can view example documents"
  on storage.objects for select using (
    bucket_id = 'example-documents'
  );
