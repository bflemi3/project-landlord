-- =============================================================================
-- Billing Intelligence: Company cache with audit history
-- Country-agnostic schema (tax_id = CNPJ in Brazil, RFC in Mexico, etc.)
-- =============================================================================

create table company_cache (
  id uuid primary key default gen_random_uuid(),
  tax_id text unique not null,             -- CNPJ in Brazil, RFC in Mexico, etc.
  country_code text not null default 'BR',
  legal_name text,                         -- razao_social in Brazil
  trade_name text,                         -- nome_fantasia in Brazil
  activity_code integer,                   -- CNAE in Brazil
  activity_description text,
  city text,
  state text,
  source text not null,                    -- 'brasilapi', 'receitaws', etc.
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on company_cache
  for each row execute function update_updated_at();

create table company_cache_history (
  id uuid primary key default gen_random_uuid(),
  company_cache_id uuid not null references company_cache(id) on delete cascade,
  field_changed text not null,
  old_value text,
  new_value text,
  detected_at timestamptz not null default now()
);

create index idx_company_cache_history_cache_id on company_cache_history(company_cache_id);

-- Server-side only
alter table company_cache enable row level security;
alter table company_cache_history enable row level security;
