-- =============================================================================
-- External dependency call log
-- Captures all external API calls (successes and failures) for monitoring.
-- The engineering playground surfaces this data for debugging and alerting.
-- =============================================================================

create table external_call_log (
  id uuid primary key default gen_random_uuid(),
  service text not null,                  -- 'brasilapi', 'receitaws', 'enliv-api', etc.
  operation text not null,                -- 'cnpj-lookup', 'fetch-debitos', etc.
  success boolean not null,
  duration_ms integer not null,
  error_category text,                    -- 'timeout', 'network', 'server_error', 'client_error', 'unexpected_shape', 'unknown'
  error_message text,
  status_code integer,
  created_at timestamptz not null default now()
);

create index idx_external_call_log_service on external_call_log(service, created_at);
create index idx_external_call_log_errors on external_call_log(success, created_at) where success = false;

-- Server-side only
alter table external_call_log enable row level security;
