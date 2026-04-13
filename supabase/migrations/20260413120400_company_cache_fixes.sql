-- =============================================================================
-- Fix company_cache: add missing updated_at trigger, drop redundant index
-- =============================================================================

-- The UNIQUE constraint on tax_id already creates an index;
-- the explicit one is redundant.
drop index if exists idx_company_cache_tax_id;

-- The foundation migration's update_updated_at() trigger was applied
-- dynamically to tables that existed at that time. company_cache was
-- created later and needs its own trigger.
create trigger set_updated_at before update on company_cache
  for each row execute function update_updated_at();
